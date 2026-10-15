<script setup lang="ts">
/** Onglet Sécurité de la configuration : checklist sur route, score de
 *  conduite, formations, types et suites d'infraction, règles d'alerte et
 *  grille de l'inspection périodique. */
import ReglageGrilleInspection from '../maintenance/ReglageGrilleInspection.vue'
import { ref } from 'vue'
import { BellRing, ClipboardCheck, Gauge, Gavel, Undo2, UserCheck } from '@lucide/vue'
import { useDepartsStore } from '../../stores/departs'
import { useControlesStore } from '../../stores/controles'
import { useScoresConducteursStore, PONDERATIONS, LIB_BAREME, type FamilleScore } from '../../stores/scoresConducteurs'
import { useFormationsStore } from '../../stores/formations'
import { useInfractionsStore, LIB_GRAVITE_INFRACTION, type GraviteInfraction } from '../../stores/infractions'
import { RouterLink } from 'vue-router'
import { useAlertesStore, LIB_CATEGORIE_ALERTE, LIB_GRAVITE_ALERTE, type CategorieAlerte } from '../../stores/alertes'
import { LIBELLE_ROLE } from '../../stores/auth'
import { ROLES_NOTIFIES } from '../../stores/reglesDocuments'
import { useConfigurationStore } from '../../stores/configuration'
import { useCarburantStore } from '../../stores/carburant'
import { useInspectionsStore } from '../../stores/inspections'
import { useMaintenanceStore } from '../../stores/maintenance'
import { PREAVIS_EQUIPEMENT_DEFAUT } from '../../stores/typesEquipements'
import type { RoleUtilisateur } from '../../types'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const controles = useControlesStore()
const scores = useScoresConducteursStore()
const formations = useFormationsStore()
const infractions = useInfractionsStore()
const alertes = useAlertesStore()

const nouveauPoint = ref({ code: '', libelle: '' }); const erreurPoint = ref('')
function ajouterPoint() {
  const r = controles.ajouterPoint(nouveauPoint.value.code, nouveauPoint.value.libelle)
  erreurPoint.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) nouveauPoint.value = { code: '', libelle: '' }
}
const departs = useDepartsStore()
const nouveauCtrl = ref({ libelle: '', bloquant: true }); const erreurCtrl = ref('')
function ajouterCtrl() {
  const r = departs.ajouterControleConducteur(nouveauCtrl.value.libelle, nouveauCtrl.value.bloquant)
  erreurCtrl.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) nouveauCtrl.value = { libelle: '', bloquant: true }
}
function renommerCtrl(code: string, e: Event) {
  const champ = e.target as HTMLInputElement
  const r = departs.renommerControleConducteur(code, champ.value)
  erreurCtrl.value = r.ok ? '' : r.motif ?? ''
  if (!r.ok) champ.value = departs.controlesConducteur.find(c => c.code === code)?.libelle ?? ''
}
const nouveauType = ref({ libelle: '', gravite: 'majeure' as GraviteInfraction }); const erreurType = ref('')
function ajouterType() {
  const r = infractions.ajouterType(nouveauType.value.libelle, nouveauType.value.gravite)
  erreurType.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) nouveauType.value = { libelle: '', gravite: 'majeure' }
}
const nouvelleSuite = ref({ libelle: '', declencheFormation: false, leveInfraction: false }); const erreurSuite = ref('')
function ajouterSuite() {
  const r = infractions.ajouterSuite(nouvelleSuite.value.libelle, nouvelleSuite.value.declencheFormation, nouvelleSuite.value.leveInfraction)
  erreurSuite.value = r.ok ? '' : r.motif ?? ''
  if (r.ok) nouvelleSuite.value = { libelle: '', declencheFormation: false, leveInfraction: false }
}
const familles = Object.keys(PONDERATIONS) as FamilleScore[]
const categories = Object.keys(LIB_CATEGORIE_ALERTE) as CategorieAlerte[]
const emit = defineEmits<{ aller: [onglet: string] }>()
const config = useConfigurationStore()
const maintenance = useMaintenanceStore()
const carburant = useCarburantStore()
const inspections = useInspectionsStore()
/** Rôles côté gestion qui peuvent recevoir une alerte. */
const ROLES_DESTINATAIRES: RoleUtilisateur[] = ROLES_NOTIFIES
/** Ouvre l'onglet Documents sur la carte des adresses de notification. */
function ouvrirAdresses() {
  emit('aller', 'documents')
  setTimeout(() => document.getElementById('adresses-notification')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
}
const erreurRegle = ref('')
function basculerDest(c: CategorieAlerte, role: RoleUtilisateur) { const r = alertes.basculerDestinataire(c, role); erreurRegle.value = r.ok ? '' : r.motif ?? '' }

/** Le seuil se lit dans la règle mais se règle à un seul endroit, là où l'événement se définit. */
function seuilDe(c: CategorieAlerte): { texte: string; onglet?: string; route?: string } {
  const p = config.parametres; const cb = carburant.parametres
  switch (c) {
    case 'document': return { texte: 'Délai de notification propre à chaque type de document', onglet: 'documents' }
    case 'carburant': return { texte: `Écart de consommation au-delà de ${cb.seuilEcartConsoPct} %, plein hors ${cb.heureDebut} h à ${cb.heureFin} h ou à plus de ${cb.ecartGpsMaxKm} km du véhicule`, onglet: 'carburant' }
    case 'carte': return { texte: 'Limites de chaque carte carburant', onglet: 'carburant' }
    case 'pneu': return { texte: 'Seuils de pression, d\'usure et de rotation', route: 'maintenance-parametres' }
    case 'checklist': return { texte: 'Tout point non conforme relevé sur route' }
    case 'infraction': return { texte: 'Toute infraction enregistrée' }
    case 'formation': return { texte: `Formation à planifier : score de conduite sous ${formations.seuilScore}, accident, incident ou suite d'infraction` }
    case 'depart': return { texte: 'Toute autorisation de départ en attente' }
    case 'trajet': return { texte: 'Seuil de chaque type d\'écart de trajet', onglet: 'ecarts' }
    case 'conduite': return { texte: 'Seuil de chaque comportement remonté par la télématique', onglet: 'telematique' }
    case 'vehicule': return { texte: 'Défaut ou perte de signal remonté par le boîtier', onglet: 'telematique' }
    case 'equipement': return { texte: `Préavis propre à chaque type d'équipement, ${PREAVIS_EQUIPEMENT_DEFAUT} jours par défaut`, onglet: 'referentiels' }
    case 'inspection': return { texte: `Contre-visite à réaliser sous ${inspections.delaiContreVisiteJours} jours` }
    case 'entretien': return { texte: `Préavis de ${p.preavisEntretienKm.toLocaleString('fr-FR')} km, ${p.preavisEntretienJours} jours ou ${maintenance.preavisHeures} heures moteur`, route: 'maintenance-parametres' }
  }
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
    <div class="flex flex-col gap-3.5">
    <div :class="L.card">
      <div class="flex items-center gap-2 mb-3"><ClipboardCheck class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Points de la checklist sur route</h2></div>
      <div v-for="p in controles.points" :key="p.code" class="flex items-center gap-2 py-1.5 border-b border-border/60">
        <span class="font-mono text-[11px] w-12 text-muted-foreground">{{ p.code }}</span>
        <input v-model="p.libelle" :class="F.fieldInput" class="!h-[32px] !text-[12px] flex-1" />
        <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="p.actif" type="checkbox" class="accent-primary" /> Actif</label>
      </div>
      <div class="flex gap-2 mt-2">
        <input v-model="nouveauPoint.code" :class="F.fieldInput" class="!h-[32px] !w-[80px] uppercase" placeholder="Code" maxlength="5" />
        <input v-model="nouveauPoint.libelle" :class="F.fieldInput" class="!h-[32px] flex-1" placeholder="Libellé du point" />
        <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterPoint">Ajouter</button>
      </div>
      <p v-if="erreurPoint" class="text-[12px] text-danger mt-2">{{ erreurPoint }}</p>
      <div class="flex justify-end mt-3"><button :class="F.btnOutline" class="!text-[12px]" @click="controles.reinitialiserPoints()"><Undo2 class="w-3.5 h-3.5" /> Revenir aux points proposés</button></div>
    </div>

    <div :class="L.card">
      <div class="flex items-center gap-2 mb-3"><UserCheck class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Contrôles du conducteur avant départ</h2></div>
      <div v-for="c in departs.controlesConducteur" :key="c.code" class="flex items-center gap-2 py-1.5 border-b border-border/60 flex-wrap">
        <input :value="c.libelle" :class="F.fieldInput" class="!h-[32px] !text-[12px] flex-1 min-w-[160px]" @change="renommerCtrl(c.code, $event)" />
        <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="c.bloquant" type="checkbox" class="accent-primary" /> Bloquant</label>
        <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="c.actif" type="checkbox" class="accent-primary" /> Actif</label>
      </div>
      <div class="flex gap-2 mt-2 items-center flex-wrap">
        <input v-model="nouveauCtrl.libelle" :class="F.fieldInput" class="!h-[32px] flex-1 min-w-[160px]" placeholder="Nouveau contrôle du conducteur" />
        <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="nouveauCtrl.bloquant" type="checkbox" class="accent-primary" /> Bloquant</label>
        <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterCtrl">Ajouter</button>
      </div>
      <p v-if="erreurCtrl" class="text-[12px] text-danger mt-2">{{ erreurCtrl }}</p>
      <div class="flex justify-end mt-3"><button :class="F.btnOutline" class="!text-[12px]" @click="departs.reinitialiserControlesConducteur()"><Undo2 class="w-3.5 h-3.5" /> Revenir aux contrôles proposés</button></div>
    </div>
    </div>

    <div class="flex flex-col gap-3.5">
      <div :class="L.card">
        <div class="flex items-center gap-2 mb-3"><Gauge class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Score de conduite</h2></div>
        <div v-for="f in familles" :key="f" class="flex items-center gap-3 py-1.5 border-b border-border/60 last:border-0">
          <label class="flex items-center gap-2 text-[13px] flex-1 cursor-pointer"><input v-model="scores.ponderations[f].actif" type="checkbox" class="accent-primary" /> {{ PONDERATIONS[f].libelle }}</label>
          <input v-model.number="scores.ponderations[f].poids" type="number" min="0" :class="F.fieldInput" class="!h-[32px] !w-[80px]" />
          <span class="text-[11px] text-muted-foreground w-10">poids</span>
        </div>
        <div :class="F.field" class="mt-3"><label :class="F.fieldLabel">Formation proposée sous le score de</label><input v-model.number="formations.seuilScore" type="number" min="0" max="100" :class="F.fieldInput" class="!w-[120px]" /></div>
        <p class="text-[11px] font-semibold text-muted-foreground uppercase mt-4 mb-1.5">Barème</p>
        <div v-for="(lib, k) in LIB_BAREME" :key="k" class="flex items-center gap-3 py-1 border-b border-border/60 last:border-0">
          <span class="text-[12px] flex-1">{{ lib }}</span>
          <input v-model.number="scores.bareme[k]" type="number" min="0" :max="k === 'plafondPieceManquante' ? 100 : undefined" :class="F.fieldInput" class="!h-[30px] !w-[80px]" />
        </div>
        <div class="flex justify-end gap-2 mt-3">
          <button :class="F.btnOutline" class="!text-[12px]" @click="scores.reinitialiserBareme()"><Undo2 class="w-3.5 h-3.5" /> Barème de départ</button>
          <button :class="F.btnOutline" class="!text-[12px]" @click="scores.reinitialiserPonderations()"><Undo2 class="w-3.5 h-3.5" /> Poids de départ</button>
        </div>
      </div>

      <div :class="L.card">
        <div class="flex items-center gap-2 mb-3"><Gavel class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Types d'infraction</h2></div>
        <div v-for="t in infractions.types" :key="t.code" class="flex items-center gap-2 py-1.5 border-b border-border/60">
          <input v-model="t.libelle" :class="F.fieldInput" class="!h-[32px] !text-[12px] flex-1" />
          <select v-model="t.gravite" :class="F.fieldInput" class="!h-[32px] !w-[110px] !text-[12px]"><option v-for="(g, k) in LIB_GRAVITE_INFRACTION" :key="k" :value="k">{{ g.label }}</option></select>
          <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="t.actif" type="checkbox" class="accent-primary" /> Actif</label>
        </div>
        <div class="flex gap-2 mt-2">
          <input v-model="nouveauType.libelle" :class="F.fieldInput" class="!h-[32px] flex-1" placeholder="Nouveau type" />
          <select v-model="nouveauType.gravite" :class="F.fieldInput" class="!h-[32px] !w-[110px] !text-[12px]"><option v-for="(g, k) in LIB_GRAVITE_INFRACTION" :key="k" :value="k">{{ g.label }}</option></select>
          <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterType">Ajouter</button>
        </div>
        <p v-if="erreurType" class="text-[12px] text-danger mt-2">{{ erreurType }}</p>
      </div>

      <div :class="L.card">
        <div class="flex items-center gap-2 mb-3"><Gavel class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Suites d'infraction</h2></div>
        <div v-for="x in infractions.suites" :key="x.code" class="flex items-center gap-2 py-1.5 border-b border-border/60 flex-wrap">
          <input v-model="x.libelle" :class="F.fieldInput" class="!h-[32px] !text-[12px] flex-1 min-w-[160px]" />
          <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="x.declencheFormation" type="checkbox" class="accent-primary" :disabled="x.leveInfraction" /> Déclenche une formation</label>
          <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="x.leveInfraction" type="checkbox" class="accent-primary" :disabled="x.declencheFormation" /> Lève l'infraction</label>
          <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="x.actif" type="checkbox" class="accent-primary" /> Active</label>
        </div>
        <div class="flex gap-2 mt-2 items-center flex-wrap">
          <input v-model="nouvelleSuite.libelle" :class="F.fieldInput" class="!h-[32px] flex-1 min-w-[160px]" placeholder="Nouvelle suite" />
          <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="nouvelleSuite.declencheFormation" type="checkbox" class="accent-primary" /> Déclenche une formation</label>
          <label class="flex items-center gap-1.5 text-[12px] cursor-pointer"><input v-model="nouvelleSuite.leveInfraction" type="checkbox" class="accent-primary" /> Lève l'infraction</label>
          <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterSuite">Ajouter</button>
        </div>
        <p v-if="erreurSuite" class="text-[12px] text-danger mt-2">{{ erreurSuite }}</p>
        <div class="flex justify-end mt-3"><button :class="F.btnOutline" class="!text-[12px]" @click="infractions.reinitialiserSuites()"><Undo2 class="w-3.5 h-3.5" /> Revenir aux suites proposées</button></div>
      </div>
    </div>

    <div :class="L.card" class="lg:col-span-2">
      <div class="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div class="flex items-center gap-2"><BellRing class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Règles d'alerte</h2></div>
        <button :class="F.btnOutline" class="!text-[12px]" @click="alertes.reinitialiserRegles()"><Undo2 class="w-3.5 h-3.5" /> Règles de départ</button>
      </div>
      <p v-if="erreurRegle" class="text-[12px] text-danger mb-2">{{ erreurRegle }}</p>
      <div class="overflow-x-auto">
        <table :class="L.table" class="min-w-[1100px]">
          <thead><tr>
            <th :class="L.th">Événement</th><th :class="L.th">Seuil</th><th :class="L.th">Gravité</th><th :class="L.th">Destinataires</th><th :class="L.th">Canaux</th><th :class="L.th">Escalade sans traitement</th>
          </tr></thead>
          <tbody>
            <tr v-for="c in categories" :key="c" :class="alertes.regles[c].actif ? '' : 'opacity-60'">
              <td :class="L.td">
                <label class="flex items-center gap-2 text-[13px] font-medium cursor-pointer"><input v-model="alertes.regles[c].actif" type="checkbox" class="accent-primary" /> {{ LIB_CATEGORIE_ALERTE[c] }}</label>
              </td>
              <td :class="L.td" class="text-[12px] max-w-[260px]">
                <span>{{ seuilDe(c).texte }}</span>
                <button v-if="seuilDe(c).onglet" type="button" class="ml-1 text-[11px] text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click="emit('aller', seuilDe(c).onglet!)">régler</button>
                <RouterLink v-else-if="seuilDe(c).route" :to="{ name: seuilDe(c).route! }" class="ml-1 text-[11px] text-primary hover:underline no-underline">régler</RouterLink>
              </td>
              <td :class="L.td">
                <select v-model="alertes.regles[c].gravite" :class="F.fieldSelect" class="!h-[30px] !text-[12px] !w-[130px]">
                  <option v-for="(lib, g) in LIB_GRAVITE_ALERTE" :key="g" :value="g">{{ lib }}</option>
                </select>
              </td>
              <td :class="L.td">
                <div class="flex flex-wrap gap-1 max-w-[300px]">
                  <button v-for="role in ROLES_DESTINATAIRES" :key="role" type="button" class="px-2 py-0.5 rounded-full text-[11px] border-0 cursor-pointer"
                    :class="alertes.regles[c].destinataires.includes(role) ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground'" @click="basculerDest(c, role)">{{ LIBELLE_ROLE[role] }}</button>
                </div>
              </td>
              <td :class="L.td" class="text-[12px] whitespace-nowrap">
                <label class="flex items-center gap-1.5 text-muted-foreground"><input type="checkbox" checked disabled class="accent-primary" /> Application</label>
                <label class="flex items-center gap-1.5 cursor-pointer"><input v-model="alertes.regles[c].email" type="checkbox" class="accent-primary" /> E-mail</label>
                <label class="flex items-center gap-1.5 cursor-pointer"><input v-model="alertes.regles[c].sms" type="checkbox" class="accent-primary" /> SMS</label>
                <button v-if="alertes.regles[c].email || alertes.regles[c].sms" type="button" class="text-[11px] text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click="ouvrirAdresses">adresses</button>
              </td>
              <td :class="L.td">
                <div class="flex items-center gap-1.5">
                  <input v-model.number="alertes.regles[c].delaiHeures" type="number" min="1" :class="F.fieldInput" class="!h-[30px] !w-[70px]" /><span class="text-[11px] text-muted-foreground">h, puis</span>
                  <select v-model="alertes.regles[c].niveau" :class="F.fieldSelect" class="!h-[30px] !w-[170px] !text-[12px]"><option v-for="role in ROLES_DESTINATAIRES" :key="role" :value="role">{{ LIBELLE_ROLE[role] }}</option></select>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <ReglageGrilleInspection class="lg:col-span-2" />
  </div>
</template>
