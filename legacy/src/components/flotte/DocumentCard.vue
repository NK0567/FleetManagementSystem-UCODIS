<script setup lang="ts">
/** Fiche d'un document de véhicule ou de personne (FMS-SC-01) : validité
 *  calculée, notification, escalade, scan, statut saisi et versions. */
import { ref, computed, watch } from 'vue'
import { CircleCheck, Paperclip, TriangleAlert } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import ChampLecture from '../maintenance/ChampLecture.vue'
import StatusPill from '../ui/StatusPill.vue'
import { useTypesDocumentsStore } from '../../stores/typesDocuments'
import { useReglesDocumentsStore } from '../../stores/reglesDocuments'
import { useAlertesStore } from '../../stores/alertes'
import { useDocumentsVehiculeStore } from '../../stores/documentsVehicule'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { formatDate } from '../../utils/helpers'
import { aujourdhuiISO } from '../../utils/horloge'
import type { EtatDocument, PieceJointe } from '../../types'
import * as F from '../../lib/formClasses'

const props = defineProps<{ cles: string[]; cle: string }>()
const emit = defineEmits<{ close: []; renouveler: [source: 'vehicule' | 'personne', entityId: string, typeCode: string] }>()
const types = useTypesDocumentsStore()
const regles = useReglesDocumentsStore()
const regleDoc = computed(() => useAlertesStore().regles.document)
const docsV = useDocumentsVehiculeStore()
const docsP = useDocumentsStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()

const cleCourante = ref(props.cle)
const index = computed(() => props.cles.indexOf(cleCourante.value))
function naviguer(d: number) { const c = props.cles[index.value + d]; if (c) cleCourante.value = c }

/** Vue commune aux deux sources. */
const doc = computed(() => {
  const [src, id] = cleCourante.value.split(':') as ['veh' | 'per', string]
  if (src === 'veh') {
    const d = docsV.liste.find(x => x.id === id); if (!d) return null
    const v = vehicules.parId(d.vehiculeId)
    return { source: 'vehicule' as const, id: d.id, entityId: d.vehiculeId, titulaire: v?.immatriculation ?? d.vehiculeId, sousTitre: v ? `${v.marque} ${v.modele}` : '',
      type: d.type, nom: docsV.libelle(d), numero: d.numero, emission: d.dateEmission, fin: d.echeance, delai: docsV.delaiDe(d), scan: d.scan,
      statutSaisi: d.statutSaisi, motifStatut: d.motifStatut, etat: docsV.etat(d) as EtatDocument, notification: docsV.notificationLe(d), escalade: docsV.escaladeLe(d),
      remplacePar: d.remplacePar, precedents: docsV.liste.filter(x => x.vehiculeId === d.vehiculeId && x.type === d.type && x.id !== d.id && !!x.remplacePar).map(x => ({ id: x.id, fin: x.echeance })) }
  }
  const d = docsP.liste.find(x => x.id === id); if (!d) return null
  const p = personnel.parId(d.personnelId)
  return { source: 'personne' as const, id: d.id, entityId: d.personnelId, titulaire: p?.nomComplet ?? d.personnelId, sousTitre: p ? `${p.matricule} · ${p.fonctionLibelle}` : '',
    type: d.type, nom: d.libelle, numero: d.reference, emission: d.dateDelivrance, fin: d.dateExpiration, delai: docsP.delaiDe(d), scan: d.scan ?? (d.fichier ? { nom: d.fichier } : undefined),
    statutSaisi: d.statutSaisi, motifStatut: d.motifStatut, etat: docsP.etat(d), notification: docsP.notificationLe(d), escalade: docsP.escaladeLe(d),
    remplacePar: d.remplacePar, precedents: docsP.liste.filter(x => x.personnelId === d.personnelId && x.type === d.type && x.id !== d.id && !!x.remplacePar).map(x => ({ id: x.id, fin: x.dateExpiration })) }
})
const def = computed(() => doc.value ? types.get(doc.value.type) : undefined)
const sidebarItems = computed(() => props.cles.map(c => ({ no: c.split(':')[1]!, label: c })))

const erreur = ref(''); const succes = ref('')
watch(cleCourante, () => { erreur.value = ''; succes.value = ''; motif.value = '' })
function resultat(r: { ok: boolean; motif?: string }, msg: string) { erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? msg : ''; return r.ok }

const motif = ref('')
function marquer(statut: 'annule' | 'perdu' | undefined) {
  if (!doc.value) return
  const store = doc.value.source === 'vehicule' ? docsV : docsP
  if (resultat(store.marquer(doc.value.id, statut, motif.value), statut ? `Document marqué ${statut === 'annule' ? 'annulé' : 'perdu'}.` : 'Statut saisi retiré.')) motif.value = ''
}
function remplacerScan(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f || !doc.value) return
  if (!/^image\/|^application\/pdf$/.test(f.type)) { erreur.value = 'Le scan doit être une image ou un PDF.'; succes.value = ''; return }
  if (f.size > 1_500_000) { erreur.value = 'Le scan dépasse 1,5 Mo.'; succes.value = ''; return }
  const lecteur = new FileReader()
  lecteur.onload = () => {
    const scan: PieceJointe = { nom: f.name, dataUrl: String(lecteur.result) }
    const r = doc.value!.source === 'vehicule' ? docsV.modifier(doc.value!.id, { scan }) : docsP.modifier(doc.value!.id, { scan, fichier: f.name })
    resultat(r, 'Scan enregistré.')
  }
  lecteur.readAsDataURL(f)
}
const banniere = computed(() => {
  const d = doc.value; if (!d) return null
  if (d.remplacePar) return { cls: 'bg-neutral-bg text-neutral', texte: 'Ce document a été remplacé par une version plus récente.' }
  if (d.etat === 'expire') return { cls: 'bg-danger-bg text-danger', texte: `Document expiré depuis le ${formatDate(d.fin)}.${def.value?.obligatoire ? (d.source === 'vehicule' ? ' Document obligatoire : ce véhicule ne peut pas être affecté tant qu’il n’est pas régularisé.' : ' Document obligatoire : cette personne ne peut pas être affectée tant qu’il n’est pas régularisé.') : ''}` }
  if (d.etat === 'proche') return { cls: 'bg-warning-bg text-warning', texte: `Expire le ${formatDate(d.fin)}, à renouveler.` }
  if (d.etat === 'annule' || d.etat === 'perdu') return { cls: 'bg-danger-bg text-danger', texte: `Document ${d.etat === 'annule' ? 'annulé' : 'perdu'} : ${d.motifStatut ?? ''}` }
  return null
})
const notificationEnvoyee = computed(() => !!doc.value?.notification && doc.value.notification <= aujourdhuiISO())
</script>

<template>
  <CardModalShell
    v-if="doc"
    :page-title="`${doc.nom} · ${doc.titulaire}`"
    :page-number="doc.id"
    banner-label="Flotte · Documents"
    :is-edit-mode="false"
    :sidebar-items="sidebarItems"
    :current-no="doc.id"
    :has-prev="index > 0"
    :has-next="index >= 0 && index < cles.length - 1"
    hide-action-bar
    @close="emit('close')"
    @go-prev="naviguer(-1)"
    @go-next="naviguer(1)"
    @select-sidebar="no => { const c = cles.find(x => x.endsWith(':' + no)); if (c) cleCourante = c }"
  >
    <template #title-badges>
      <StatusPill :statut="doc.etat" />
      <span v-if="def?.obligatoire" class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-bg text-neutral">Obligatoire</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>
        <div v-if="banniere" class="flex items-start gap-2 rounded-lg px-3.5 py-2.5 mb-3 text-xs" :class="banniere.cls"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ banniere.texte }}</div>

        <FormSection title="Document" :recaps="[doc.titulaire, types.libelle(doc.type)]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture :libelle="doc.source === 'vehicule' ? 'Véhicule' : 'Personne'" :mono="doc.source === 'vehicule'">{{ doc.titulaire }}<div class="text-[11px] text-muted-foreground font-sans">{{ doc.sousTitre }}</div></ChampLecture>
            <ChampLecture libelle="Type">{{ types.libelle(doc.type) }}</ChampLecture>
            <ChampLecture libelle="Nom">{{ doc.nom }}</ChampLecture>
            <ChampLecture libelle="Numéro" mono>{{ doc.numero ?? '-' }}</ChampLecture>
          </div>
        </FormSection>

        <FormSection title="Validité" :recaps="[def?.validite === 'illimitee' ? 'illimitée' : doc.fin ? `jusqu'au ${formatDate(doc.fin)}` : 'non renseignée']">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Émission">{{ doc.emission ? formatDate(doc.emission) : '-' }}</ChampLecture>
            <ChampLecture libelle="Type de validité">{{ def?.validite === 'illimitee' ? 'Illimitée' : 'Limitée' }}</ChampLecture>
            <template v-if="def?.validite !== 'illimitee'">
              <ChampLecture libelle="Fin de validité">{{ doc.fin ? formatDate(doc.fin) : '-' }}</ChampLecture>
              <ChampLecture libelle="Notification avant expiration">{{ doc.delai }} jour(s)</ChampLecture>
              <ChampLecture libelle="Notification" large>
                <template v-if="doc.notification">
                  {{ notificationEnvoyee ? 'Envoyée le' : 'Prévue le' }} {{ formatDate(doc.notification) }}
                  <span class="text-muted-foreground">· {{ regles.diffusion(regleDoc.email, regleDoc.sms, regleDoc.destinataires) }}</span>
                </template>
                <template v-else>-</template>
              </ChampLecture>
              <ChampLecture v-if="doc.escalade" libelle="Escalade" large>
                <span :class="doc.escalade <= aujourdhuiISO() ? 'text-danger font-medium' : ''">{{ doc.escalade <= aujourdhuiISO() ? 'Escaladée le' : 'Escalade prévue le' }} {{ formatDate(doc.escalade) }}</span>
                <span v-if="doc.source === 'vehicule' && def?.obligatoire" class="text-muted-foreground"> · le véhicule devient indisponible pour cause réglementaire</span>
              </ChampLecture>
            </template>
          </div>
        </FormSection>

        <FormSection title="Scan" :recaps="[doc.scan ? doc.scan.nom : 'aucun']">
          <div v-if="doc.scan" class="flex items-center gap-3 mb-3">
            <img v-if="doc.scan.dataUrl?.startsWith('data:image')" :src="doc.scan.dataUrl" alt="Scan" class="w-32 rounded-md border border-border" />
            <a v-if="doc.scan.dataUrl" :href="doc.scan.dataUrl" target="_blank" rel="noopener" class="text-sm text-primary hover:underline">{{ doc.scan.nom }}</a>
            <span v-else class="text-sm text-foreground">{{ doc.scan.nom }}</span>
          </div>
          <label :class="F.btnOutline" class="w-fit cursor-pointer"><Paperclip class="w-4 h-4" /> {{ doc.scan ? 'Remplacer le scan' : 'Joindre le scan' }}<input type="file" accept="image/*,application/pdf" class="hidden" @change="remplacerScan" /></label>
        </FormSection>

        <FormSection title="Statut" :recaps="[doc.statutSaisi ? (doc.statutSaisi === 'annule' ? 'annulé' : 'perdu') : 'calculé']" :default-open="!!doc.statutSaisi">
          <template v-if="doc.statutSaisi">
            <p class="text-xs text-foreground mb-2">Motif : {{ doc.motifStatut }}</p>
            <button :class="F.btnOutline" @click="marquer(undefined)">Retirer ce statut</button>
          </template>
          <div v-else class="flex gap-2 items-end flex-wrap">
            <div :class="F.field" class="flex-1 min-w-[220px]"><label :class="F.fieldLabel">Motif *</label><input v-model="motif" :class="F.fieldInput" /></div>
            <button :class="F.btnOutline" @click="marquer('annule')">Marquer annulé</button>
            <button :class="F.btnOutline" @click="marquer('perdu')">Marquer perdu</button>
          </div>
        </FormSection>

        <FormSection title="Renouvellement et versions" :recaps="[`${doc.precedents.length} version(s) précédente(s)`]" :default-open="doc.etat !== 'valide'">
          <div v-for="p in doc.precedents" :key="p.id" class="text-xs border-b border-border/60 py-1.5">{{ p.id }} · {{ p.fin ? `fin de validité ${formatDate(p.fin)}` : 'validité illimitée' }}</div>
          <p v-if="!doc.precedents.length" class="text-xs text-muted-foreground mb-2">Aucune version précédente.</p>
          <button v-if="!doc.remplacePar" :class="F.btnPrimary" class="mt-2" @click="emit('renouveler', doc.source, doc.entityId, doc.type)">Enregistrer le nouveau document</button>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
