<template>
  <div :class="L.card" class="mt-5">
    <p class="text-sm font-semibold text-foreground mb-4">Planification : circuit des commandes</p>

    <div class="flex flex-col gap-4">
      <div>
        <p :class="lbl" class="mb-2">Arrivée des commandes à livrer</p>
        <div class="flex flex-col gap-1.5">
          <label class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
            <input type="checkbox" class="w-4 h-4 accent-primary" :checked="p.importCommandes" @change="appliquer(store.definirImport(!p.importCommandes), $event)" />
            Import depuis le système de gestion de l'entreprise
          </label>
          <label class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
            <input type="checkbox" class="w-4 h-4 accent-primary" :checked="p.saisieParPlanificateur" @change="appliquer(store.definirSaisie(!p.saisieParPlanificateur), $event)" />
            Saisie directe par le planificateur dans un ordre de transport
          </label>
        </div>
      </div>

      <div>
        <p :class="lbl" class="mb-2">Transmission par un service : rôles ordonnateurs</p>
        <div class="flex flex-wrap gap-x-5 gap-y-1.5">
          <label v-for="r in ROLES" :key="r.valeur" class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
            <input type="checkbox" class="w-4 h-4 accent-primary" :checked="p.rolesEmetteurs.includes(r.valeur)" @change="appliquer(store.basculerEmetteur(r.valeur), $event)" />
            {{ r.libelle }}
          </label>
        </div>
      </div>

      <div>
        <p :class="lbl" class="mb-2">Rôles habilités à planifier, annuler et clôturer</p>
        <div class="flex flex-wrap gap-x-5 gap-y-1.5">
          <label v-for="r in ROLES_HABILITABLES" :key="r.valeur" class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
            <input type="checkbox" class="w-4 h-4 accent-primary" :checked="p.habilites.includes(r.valeur)" @change="appliquer(store.basculerHabilite(r.valeur), $event)" />
            {{ r.libelle }}
          </label>
        </div>
      </div>

      <div>
        <p :class="lbl" class="mb-2">Rôles qui déclarent le chargement</p>
        <div class="flex flex-wrap gap-x-5 gap-y-1.5" data-roles-chargement>
          <label v-for="r in ROLES_HABILITABLES" :key="r.valeur" class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
            <input type="checkbox" class="w-4 h-4 accent-primary" :checked="p.rolesChargement.includes(r.valeur)" @change="appliquer(store.basculerRoleChargement(r.valeur), $event)" />
            {{ r.libelle }}
          </label>
        </div>
      </div>

      <div>
        <p :class="lbl" class="mb-2">Rôles qui valident une facture de transporteur sans grille tarifaire</p>
        <div class="flex flex-wrap gap-x-5 gap-y-1.5" data-roles-sans-tarif>
          <label v-for="r in ROLES_HABILITABLES" :key="r.valeur" class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
            <input type="checkbox" class="w-4 h-4 accent-primary" :checked="p.rolesValidationSansTarif.includes(r.valeur)" @change="appliquer(store.basculerValidationSansTarif(r.valeur), $event)" />
            {{ r.libelle }}
          </label>
        </div>
      </div>

      <p v-if="motif" class="text-[12px] text-destructive">{{ motif }}</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="flex flex-col gap-1.5">
          <label :class="lbl">Libellé de la référence de commande</label>
          <input :value="p.libelleReferenceExterne" :class="cls.fieldInput" placeholder="Ex. N° de bon de livraison, N° de commande" @change="majTexte(store.definirLibelleReference, $event, p.libelleReferenceExterne)" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label :class="lbl">Unité de comptage des marchandises</label>
          <input :value="p.uniteComptage" :class="cls.fieldInput" placeholder="Ex. cartons, colis, palettes" @change="majTexte(store.definirUniteComptage, $event, p.uniteComptage)" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label :class="lbl">Marge avant de signaler un retard (minutes)</label>
          <input :value="p.margeRetardMin" type="number" min="0" :class="cls.fieldInput" @change="majTexte(v => store.definirMargeRetard(Number(v)), $event, String(p.margeRetardMin))" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label :class="lbl">Vitesse moyenne pour estimer les heures d'arrivée (km/h)</label>
          <input :value="p.vitesseMoyenneKmh" type="number" min="1" max="130" :class="cls.fieldInput" @change="majTexte(v => store.definirVitesseMoyenne(Number(v)), $event, String(p.vitesseMoyenneKmh))" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label :class="lbl">Modes de transport, séparés par une virgule</label>
          <input :value="p.modesTransport.join(', ')" :class="cls.fieldInput" @change="majTexte(v => store.definirModesTransport(v.split(',')), $event, p.modesTransport.join(', '))" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label :class="lbl">Heure de départ par défaut</label>
          <input :value="p.heureDepartDefaut" type="time" :class="cls.fieldInput" @change="majTexte(store.definirHeureDepart, $event, p.heureDepartDefaut)" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label :class="lbl">Rôle de l'agent qui appelle les clients</label>
          <select :value="p.roleAgentAppels" :class="cls.fieldSelect" @change="majTexte(v => store.definirRoleAgentAppels(v as RoleUtilisateur), $event, p.roleAgentAppels)">
            <option v-for="r in ROLES_HABILITABLES" :key="r.valeur" :value="r.valeur">{{ r.libelle }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label :class="lbl">Fret à la charge de, par défaut</label>
          <select :value="p.fretALaChargeDefaut" :class="cls.fieldSelect" @change="majTexte(store.definirFretALaCharge, $event, p.fretALaChargeDefaut)">
            <option value="ordonnateur">L'ordonnateur</option>
            <option value="destinataire">Le destinataire</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label :class="lbl">Délai de confirmation tacite (jours)</label>
          <input :value="p.delaiConfirmationTaciteJours ?? ''" type="number" min="1" :class="cls.fieldInput" placeholder="Vide : jamais" @change="majTexte(store.definirDelaiConfirmationTacite, $event, String(p.delaiConfirmationTaciteJours ?? ''))" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label :class="lbl">Écart toléré sur la facture d'un transporteur</label>
          <input :value="p.toleranceFactureTransporteur" type="number" min="0" :class="cls.fieldInput" @change="majTexte(store.definirToleranceFacture, $event, String(p.toleranceFactureTransporteur))" />
        </div>
      </div>

      <label class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
        <input type="checkbox" class="w-4 h-4 accent-primary" v-model="p.referenceExterneObligatoire" />
        La référence de commande est obligatoire pour émettre une demande
      </label>
      <label class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
        <input type="checkbox" class="w-4 h-4 accent-primary" v-model="p.preremplirQuantites" />
        Pré-remplir les quantités à la livraison
      </label>

      <div class="flex justify-end">
        <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="store.reinitialiser(); motif = ''">Revenir aux réglages par défaut</button>
        <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px] ml-2" @click="voyages.reinitialiser(); resultatDemo = 'Ordres de transport de démonstration rétablis.'">Revenir aux ordres de démonstration</button>
      </div>
      <p v-if="resultatDemo" class="text-[12px] text-success text-right">{{ resultatDemo }}</p>
    </div>
  </div>
  <ReglageTarifsTransport />
  <ReglageContraintesLivraison />
  <ReglageControlesTransport />
  <ReglagePerimetres />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useParametresPlanificationStore, type Resultat } from '../stores/parametresPlanification'
import { useVoyagesStore } from '../stores/voyages'
import ReglageTarifsTransport from './planification/ReglageTarifsTransport.vue'
import ReglageContraintesLivraison from './planification/ReglageContraintesLivraison.vue'
import ReglageControlesTransport from './planification/ReglageControlesTransport.vue'
import ReglagePerimetres from './planification/ReglagePerimetres.vue'
import type { RoleUtilisateur } from '../types'
import { LIBELLE_ROLE } from '../stores/auth'
import * as L from '../lib/listClasses'
import * as cls from '../lib/formClasses'

const store = useParametresPlanificationStore()
const p = computed(() => store.parametres)
const lbl = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]'
/* Mêmes libellés de rôle que partout ailleurs dans l'application. */
const ROLES: { valeur: RoleUtilisateur; libelle: string }[] = (['commercial', 'charge_clientele', 'responsable_flotte', 'depot', 'direction', 'admin'] as RoleUtilisateur[])
  .map(valeur => ({ valeur, libelle: LIBELLE_ROLE[valeur] }))
/** La direction reste en lecture seule : elle n'est jamais proposée. */
const ROLES_HABILITABLES = ROLES.filter(r => r.valeur !== 'direction')
const motif = ref('')
const voyages = useVoyagesStore()
const resultatDemo = ref('')
/** Libellé ou unité : refusé s'il est vide, la zone revient alors à la valeur enregistrée. */
function majTexte(definir: (v: string) => Resultat, e: Event, actuel: string) {
  const zone = e.target as HTMLInputElement | HTMLSelectElement
  const r = definir(zone.value)
  motif.value = r.ok ? '' : (r.motif ?? '')
  if (!r.ok) zone.value = actuel
}
function appliquer(r: Resultat, e: Event) {
  motif.value = r.ok ? '' : (r.motif ?? '')
  /* Refus : la case revient à son état précédent. */
  if (!r.ok) { const c = e.target as HTMLInputElement; c.checked = !c.checked }
}
</script>
