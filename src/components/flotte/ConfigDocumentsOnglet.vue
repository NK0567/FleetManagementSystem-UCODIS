<script setup lang="ts">
/** Onglet Documents de la configuration : types de documents et règles d'alerte (FMS-SC-01). */
import { ref, computed, watch } from 'vue'
import { useConfigurationStore } from '../../stores/configuration'
import { BellRing, FileText, ShieldAlert, Undo2 } from '@lucide/vue'
import { useTypesDocumentsStore, LIB_CIBLE, SOUS_CIBLES, type CibleDocument, type ValiditeDocument } from '../../stores/typesDocuments'
import { useTypesVehiculesStore } from '../../stores/typesVehicules'
import { useReglesDocumentsStore, ROLES_NOTIFIES } from '../../stores/reglesDocuments'
import { LIBELLE_ROLE } from '../../stores/auth'
import type { RoleUtilisateur } from '../../types'
import { useCodificationIndispoStore } from '../../stores/codificationIndispo'
import { useDocumentsEntrepriseStore } from '../../stores/documentsEntreprise'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const types = useTypesDocumentsStore()
const regles = useReglesDocumentsStore()
const codif = useCodificationIndispoStore()
const docsEntreprise = useDocumentsEntrepriseStore()
const p = regles.parametres

const cible = ref<CibleDocument>('vehicule')
const liste = computed(() => types.types.filter(t => t.cible === cible.value))
const config = useConfigurationStore()
/** Délai par défaut : il pré-remplit le délai d'un nouveau type de document. */
const delaiDefaut = () => config.parametres.preavisDocumentaireJours ?? 30
const nouveau = ref({ libelle: '', appliqueA: [] as string[], obligatoire: false, validite: 'limitee' as ValiditeDocument, dureeMois: 12 as number | undefined, delaiNotificationJours: delaiDefaut() })
watch(() => config.parametres.preavisDocumentaireJours, v => { if (v != null) nouveau.value.delaiNotificationJours = v })
const erreurDelai = ref('')
function majDelaiDefaut(champ: HTMLInputElement) {
  const n = Number(champ.value)
  if (!champ.value.trim() || !Number.isInteger(n) || n < 0) { champ.value = String(delaiDefaut()); erreurDelai.value = 'Le délai par défaut est un nombre entier de jours, positif ou nul.'; return }
  erreurDelai.value = ''
  config.parametres.preavisDocumentaireJours = n
}
const erreur = ref('')
function ajouter() {
  const r = types.ajouter({ ...nouveau.value, cible: cible.value })
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  erreur.value = ''
  nouveau.value = { libelle: '', appliqueA: [], obligatoire: false, validite: 'limitee', dureeMois: 12, delaiNotificationJours: delaiDefaut() }
}
/** Liste vide : le type s'applique à toutes les sous-catégories. Décocher la
 *  dernière est refusé, un type doit s'appliquer à quelque chose. */
function basculerSousCible(liste: string[], id: string) {
  const toutes = sousCibles.value.map(x => x.id)
  const actives = liste.length ? [...liste] : [...toutes]
  const i = actives.indexOf(id)
  if (i >= 0) { if (actives.length === 1) return; actives.splice(i, 1) } else actives.push(id)
  liste.splice(0, liste.length, ...(actives.length === toutes.length ? [] : actives))
}

/** Adresses de notification : un e-mail et un téléphone par rôle (FMS-PA-06). */
const erreurDest = ref('')
function majContact(role: RoleUtilisateur, champ: 'email' | 'telephone', e: Event) {
  const zone = e.target as HTMLInputElement
  const r = regles.modifierContact(role, champ, zone.value)
  erreurDest.value = r.ok ? '' : r.motif ?? ''
  if (!r.ok) zone.value = p.contacts[role]?.[champ] ?? ''
}
const codesReglementaires = computed(() => codif.codes.filter(c => c.famille === 'reglementaire'))
/** Pour un véhicule, les sous-catégories sont les types de véhicules paramétrés. */
const typesVeh = useTypesVehiculesStore()
const sousCibles = computed(() => cible.value === 'vehicule' ? typesVeh.types.map(t => ({ id: t.code, label: t.libelle })) : SOUS_CIBLES[cible.value])
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <div :class="L.card">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2"><FileText class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Types de documents</h2></div>
        <div class="flex gap-1">
          <button v-for="(lib, c) in LIB_CIBLE" :key="c" class="px-2.5 py-1 rounded-md text-[12px] border-0 cursor-pointer" :class="cible === c ? 'bg-primary text-white' : 'bg-background text-muted-foreground'" @click="cible = c as CibleDocument">{{ lib }}</button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-[13px]">
          <thead><tr class="text-left text-[11px] uppercase text-muted-foreground">
            <th class="py-1.5 pr-3">Libellé</th><th v-if="sousCibles.length" class="py-1.5 pr-3">S'applique à</th><th class="py-1.5 pr-3">Obligatoire</th>
            <th class="py-1.5 pr-3">Validité</th><th class="py-1.5 pr-3">Durée (mois)</th><th class="py-1.5 pr-3">Notification (jours avant)</th><th class="py-1.5">Actif</th>
          </tr></thead>
          <tbody>
            <tr v-for="t in liste" :key="t.code" class="border-t border-border/60">
              <td class="py-1.5 pr-3"><input v-model="t.libelle" :class="F.fieldInput" class="!h-[32px] !text-[12px]" /></td>
              <td v-if="sousCibles.length" class="py-1.5 pr-3">
                <div class="flex gap-1 flex-wrap">
                  <button v-for="sc in sousCibles" :key="sc.id" class="px-2 py-0.5 rounded-full text-[11px] border-0 cursor-pointer" :class="!t.appliqueA.length || t.appliqueA.includes(sc.id) ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground'" @click="basculerSousCible(t.appliqueA, sc.id)">{{ sc.label }}</button>
                </div>
              </td>
              <td class="py-1.5 pr-3"><input v-model="t.obligatoire" type="checkbox" class="accent-primary" /></td>
              <td class="py-1.5 pr-3"><select v-model="t.validite" :class="F.fieldInput" class="!h-[32px] !text-[12px]"><option value="limitee">Limitée</option><option value="illimitee">Illimitée</option></select></td>
              <td class="py-1.5 pr-3"><input v-model.number="t.dureeMois" type="number" min="1" :disabled="t.validite === 'illimitee'" :class="F.fieldInput" class="!h-[32px] !w-[80px] !text-[12px]" /></td>
              <td class="py-1.5 pr-3"><input v-model.number="t.delaiNotificationJours" type="number" min="0" :disabled="t.validite === 'illimitee'" :class="F.fieldInput" class="!h-[32px] !w-[80px] !text-[12px]" /></td>
              <td class="py-1.5"><input v-model="t.actif" type="checkbox" class="accent-primary" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="grid grid-cols-[1.4fr_auto_auto_90px_90px_auto] gap-2 items-end mt-3 max-md:grid-cols-2">
        <div :class="F.field"><label :class="F.fieldLabel">Nouveau type</label><input v-model="nouveau.libelle" :class="F.fieldInput" class="!h-[32px]" placeholder="ex. Autorisation de transport" /></div>
        <label class="flex items-center gap-1.5 text-[12px] cursor-pointer pb-2"><input v-model="nouveau.obligatoire" type="checkbox" class="accent-primary" /> Obligatoire</label>
        <select v-model="nouveau.validite" :class="F.fieldInput" class="!h-[32px] !text-[12px]"><option value="limitee">Limitée</option><option value="illimitee">Illimitée</option></select>
        <input v-model.number="nouveau.dureeMois" type="number" min="1" :disabled="nouveau.validite === 'illimitee'" :class="F.fieldInput" class="!h-[32px]" placeholder="mois" />
        <input v-model.number="nouveau.delaiNotificationJours" type="number" min="0" :disabled="nouveau.validite === 'illimitee'" :class="F.fieldInput" class="!h-[32px]" placeholder="jours" />
        <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouter">Ajouter</button>
      </div>
      <p v-if="erreur" class="text-[12px] text-danger mt-2">{{ erreur }}</p>
      <div class="flex items-end justify-between gap-3 mt-3 flex-wrap">
        <div :class="F.field"><label :class="F.fieldLabel">Délai de notification par défaut (jours)</label><input :value="config.parametres.preavisDocumentaireJours" type="number" min="0" :class="F.fieldInput" class="!h-[32px] !w-[120px]" @change="majDelaiDefaut($event.target as HTMLInputElement)" /></div><button :class="F.btnOutline" class="!text-[12px]" @click="types.reinitialiser()"><Undo2 class="w-3.5 h-3.5" /> Revenir aux types proposés</button>
      </div>
      <p v-if="erreurDelai" class="text-[12px] text-danger mt-2">{{ erreurDelai }}</p>
    </div>

    <div id="adresses-notification" :class="L.card">
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2"><BellRing class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Adresses de notification</h2></div>
        <button :class="F.btnOutline" class="!text-[12px]" @click="regles.reinitialiserContacts(); erreurDest = ''"><Undo2 class="w-3.5 h-3.5" /> Revenir aux adresses des fiches du personnel</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-[13px]">
          <thead><tr class="text-left text-[11px] uppercase text-muted-foreground">
            <th class="py-1.5 pr-3">Rôle</th><th class="py-1.5 pr-3">Adresse e-mail</th><th class="py-1.5">Téléphone (SMS)</th>
          </tr></thead>
          <tbody>
            <tr v-for="role in ROLES_NOTIFIES" :key="role" class="border-t border-border/60">
              <td class="py-1.5 pr-3 whitespace-nowrap">{{ LIBELLE_ROLE[role] }}</td>
              <td class="py-1.5 pr-3"><input :key="`e-${role}-${p.contacts[role]?.email}`" :value="p.contacts[role]?.email ?? ''" :class="F.fieldInput" class="!h-[32px] !text-[12px]" placeholder="adresse e-mail" @change="majContact(role, 'email', $event)" /></td>
              <td class="py-1.5"><input :key="`t-${role}-${p.contacts[role]?.telephone}`" :value="p.contacts[role]?.telephone ?? ''" :class="F.fieldInput" class="!h-[32px] !text-[12px]" placeholder="numéro de téléphone" @change="majContact(role, 'telephone', $event)" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="erreurDest" class="text-[12px] text-danger mt-2">{{ erreurDest }}</p>
    </div>

    <div :class="L.card">
      <div class="flex items-center gap-2 mb-3"><ShieldAlert class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Document expiré et validation</h2></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
        <div :class="F.field"><label :class="F.fieldLabel">Code d'indisponibilité appliqué au véhicule</label>
          <select v-model="p.codeIndispoReglementaire" :class="F.fieldInput"><option v-for="c in codesReglementaires" :key="c.code" :value="c.code">{{ c.code }} · {{ c.libelle }}</option></select>
        </div>
        <label class="flex items-center gap-2 text-[13px] cursor-pointer pb-2"><input v-model="docsEntreprise.validationParAutrePersonne" type="checkbox" class="accent-primary" /> Un document de l'entreprise est validé par une autre personne que son déposant</label>
      </div>
    </div>
  </div>
</template>
