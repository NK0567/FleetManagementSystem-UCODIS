<script setup lang="ts">
/** Fiche prestataire : coordonnées, contrats et autorisation à travailler avec l'entreprise (FMS-DB-13). */
import { ref, computed, watch } from 'vue'
import { CircleCheck, TriangleAlert } from '@lucide/vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import ChampLecture from '../maintenance/ChampLecture.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { usePrestatairesStore, TYPE_TRANSPORTEUR } from '../../stores/prestataires'
import { useTypesVehiculesStore } from '../../stores/typesVehicules'
import { formatDate } from '../../utils/helpers'
import { aujourdhuiISO } from '../../utils/horloge'
import * as F from '../../lib/formClasses'
import { useVoyagesStore } from '../../stores/voyages'
import { useAuthStore } from '../../stores/auth'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import { STATUTS_VOYAGE, fmtDateHeure } from '../../utils/voyageUtils'
import { fmtMontant } from '../../lib/monnaie'

const props = defineProps<{ ids: string[]; prestataireId: string }>()
const emit = defineEmits<{ close: [] }>()
const store = usePrestatairesStore()
const idCourant = ref(props.prestataireId)
const item = computed(() => store.getById(idCourant.value) ?? null)
const index = computed(() => props.ids.indexOf(idCourant.value))
const sidebarItems = computed(() => props.ids.map(id => ({ no: id, label: store.getById(id)?.nom })))
function naviguer(d: number) { const c = props.ids[index.value + d]; if (c) idCourant.value = c }
const libelleType = (code: string) => store.types.find(t => t.code === code)?.libelle ?? code
const optTypes = computed<DropdownItem[]>(() => store.types.map(t => ({ id: t.code, label: t.libelle })))

const erreur = ref(''); const succes = ref('')
function resultat(r: { ok: boolean; motif?: string }, msg: string) { erreur.value = r.ok ? '' : r.motif ?? ''; succes.value = r.ok ? msg : ''; return r.ok }

const enEdition = ref(false)
const form = ref({ nom: '', type: '', contact: '', telephone: '', email: '', adresse: '' })
function entrer() {
  const p = item.value; if (!p) return
  form.value = { nom: p.nom, type: p.type, contact: p.contact ?? '', telephone: p.telephone ?? '', email: p.email ?? '', adresse: p.adresse ?? '' }
  enEdition.value = true
}
function enregistrer() {
  const p = item.value; if (!p) return
  const f = form.value
  if (resultat(store.modifier(p.id, { nom: f.nom.trim(), type: f.type, contact: f.contact.trim() || undefined, telephone: f.telephone.trim() || undefined, email: f.email.trim() || undefined, adresse: f.adresse.trim() || undefined }), 'Prestataire enregistré.'))
    enEdition.value = false
}
const motifRetrait = ref('')
function retirerAutorisation() { if (item.value && resultat(store.changerAutorisation(item.value.id, false, motifRetrait.value), 'Le prestataire n’est plus proposé.')) motifRetrait.value = '' }
function retablir() { if (item.value) resultat(store.changerAutorisation(item.value.id, true), 'Le prestataire est de nouveau autorisé.') }

const nouveauContrat = ref({ objet: '', debut: aujourdhuiISO(), fin: '', montantAr: undefined as number | undefined })
function ajouterContrat() {
  if (!item.value) return
  const c = nouveauContrat.value
  if (resultat(store.ajouterContrat(item.value.id, { objet: c.objet, debut: c.debut, fin: c.fin || undefined, montantAr: c.montantAr }), 'Contrat ajouté.'))
    nouveauContrat.value = { objet: '', debut: aujourdhuiISO(), fin: '', montantAr: undefined }
}
const etatContrat = (c: { debut: string; fin?: string }) => c.debut > aujourdhuiISO() ? 'À venir' : c.fin && c.fin < aujourdhuiISO() ? 'Terminé' : 'En cours'
/* Transporteur externe : ses véhicules et ses conducteurs. */
const estTransporteur = computed(() => item.value?.type === TYPE_TRANSPORTEUR)
const typesVeh = useTypesVehiculesStore()
const nvVehicule = ref({ immatriculation: '', typeVehicule: '', chargeUtileKg: undefined as number | undefined, volumeM3: undefined as number | undefined, pompe: false })
function ajouterVehicule() {
  if (!item.value) return
  const v = nvVehicule.value
  if (resultat(store.ajouterVehicule(item.value.id, { immatriculation: v.immatriculation, typeVehicule: v.typeVehicule, chargeUtileKg: v.chargeUtileKg || undefined, volumeM3: v.volumeM3 || undefined, pompe: v.pompe || undefined }), 'Véhicule ajouté.'))
    nvVehicule.value = { immatriculation: '', typeVehicule: '', chargeUtileKg: undefined, volumeM3: undefined, pompe: false }
}
const nvConducteur = ref({ nom: '', telephone: '' })
function ajouterConducteur() {
  if (item.value && resultat(store.ajouterConducteur(item.value.id, nvConducteur.value), 'Conducteur ajouté.')) nvConducteur.value = { nom: '', telephone: '' }
}
/* Factures du transporteur : une facture couvre une ou plusieurs expéditions qui lui ont été confiées,
   rapprochées de leur statut de livraison et du montant convenu ; l'écart est signalé. */
const voyagesStore = useVoyagesStore()
const auth = useAuthStore()
const paramsPlanif = useParametresPlanificationStore()
const peutControler = computed(() => !auth.lectureSeule && paramsPlanif.peutPiloter(auth.role))
const sansTarifPermis = computed(() => paramsPlanif.peutValiderSansTarif(auth.role))
const expeditions = computed(() => item.value ? voyagesStore.expeditionsDuTransporteur(item.value.id) : [])
const factures = computed(() => item.value ? voyagesStore.facturesGroupees.filter(f => f.transporteurId === item.value!.id).slice().reverse() : [])
const LIB_FACTURE = { a_controler: 'À contrôler', validee: 'Validée', refusee: 'Refusée' } as const
const saisieFacture = ref<{ numero: string; date: string; montant: number | null; voyageIds: string[] } | null>(null)
/* Une expédition déjà facturée (facture groupée ou propre facture non refusée) ne peut pas être cochée. */
function dejaFacturee(v: { id: string; factureTransporteur?: { reference: string; statut: string } }): string | null {
  const g = voyagesStore.factureGroupeeDe(v.id)
  if (g) return g.numero
  return v.factureTransporteur && v.factureTransporteur.statut !== 'refusee' ? v.factureTransporteur.reference : null
}
const rapprochementSaisie = computed(() => saisieFacture.value ? voyagesStore.rapprochementFacture(saisieFacture.value.voyageIds, saisieFacture.value.montant) : null)
function ouvrirSaisieFacture() { saisieFacture.value = { numero: '', date: aujourdhuiISO(), montant: null, voyageIds: [] } }
function enregistrerFacture() {
  const f = saisieFacture.value
  if (!f || !item.value) return
  if (resultat(voyagesStore.saisirFactureGroupee({ transporteurId: item.value.id, numero: f.numero, date: f.date, montantTotal: Number(f.montant), voyageIds: f.voyageIds }), 'Facture enregistrée, à contrôler.'))
    saisieFacture.value = null
}
const motifsRefus = ref<Record<string, string>>({})
const motifsSansTarif = ref<Record<string, string>>({})
function validerFacture(id: string) { resultat(voyagesStore.validerFactureGroupee(id, motifsSansTarif.value[id] ?? ''), 'Facture validée.') }
function refuserFacture(id: string) { if (resultat(voyagesStore.refuserFactureGroupee(id, motifsRefus.value[id] ?? ''), 'Facture refusée.')) motifsRefus.value[id] = '' }
const ecartTexte = (e: number | null) => e == null ? '' : `${e > 0 ? '+' : ''}${fmtMontant(e)}`
watch(idCourant, () => { erreur.value = ''; succes.value = ''; enEdition.value = false; motifRetrait.value = ''; saisieFacture.value = null })
</script>

<template>
  <CardModalShell v-if="item" :page-title="item.nom" :page-number="item.id" banner-label="Flotte · Prestataires" :is-edit-mode="enEdition"
    :sidebar-items="sidebarItems" :current-no="item.id" :has-prev="index > 0" :has-next="index >= 0 && index < ids.length - 1"
    :has-unsaved-changes="enEdition" :show-edit="true"
    @close="emit('close')" @go-prev="naviguer(-1)" @go-next="naviguer(1)" @select-sidebar="no => { if (store.getById(no)) idCourant = no }"
    @enter-edit="entrer" @cancel-edit="enEdition = false" @save="enregistrer">
    <template #title-badges>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{{ libelleType(item.type) }}</span>
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" :class="item.autorise ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ item.autorise ? 'Autorisé' : 'Non autorisé' }}</span>
    </template>
    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div v-if="erreur" class="flex items-center gap-2 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3 text-xs"><TriangleAlert class="w-4 h-4 shrink-0" /> {{ erreur }}</div>
        <div v-else-if="succes" class="flex items-center gap-2 bg-success-bg text-success rounded-lg px-3.5 py-2.5 mb-3 text-xs"><CircleCheck class="w-4 h-4 shrink-0" /> {{ succes }}</div>

        <FormSection title="Coordonnées" :recaps="[item.contact ?? '', item.telephone ?? '']">
          <div v-if="enEdition" class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Nom *</label><input v-model="form.nom" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Type *</label><SearchableDropdown v-model="form.type" :items="optTypes" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Contact</label><input v-model="form.contact" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Téléphone</label><input v-model="form.telephone" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">E-mail</label><input v-model="form.email" type="email" :class="F.fieldInput" /></div>
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Adresse</label><input v-model="form.adresse" :class="F.fieldInput" /></div>
          </div>
          <div v-else class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Identifiant" mono>{{ item.id }}</ChampLecture>
            <ChampLecture libelle="Type">{{ libelleType(item.type) }}</ChampLecture>
            <ChampLecture libelle="Contact">{{ item.contact ?? '-' }}</ChampLecture>
            <ChampLecture libelle="Téléphone">{{ item.telephone ?? '-' }}</ChampLecture>
            <ChampLecture libelle="E-mail">{{ item.email ?? '-' }}</ChampLecture>
            <ChampLecture libelle="Origine">{{ item.source === 'import' ? 'Repris par import' : 'Saisi dans le FMS' }}</ChampLecture>
            <ChampLecture libelle="Adresse" large>{{ item.adresse ?? '-' }}</ChampLecture>
          </div>
        </FormSection>

        <FormSection v-if="estTransporteur" title="Véhicules" :recaps="[`${item.vehicules?.length ?? 0} véhicule(s)`]" :default-open="true">
          <div v-if="!item.vehicules?.length" class="text-xs text-muted-foreground mb-2">Aucun véhicule.</div>
          <div v-for="v in item.vehicules ?? []" :key="v.id" class="flex items-center justify-between gap-2 py-1.5 border-b border-border/60 text-xs">
            <span class="min-w-0"><span class="font-mono font-semibold mr-1.5">{{ v.immatriculation }}</span>{{ v.typeVehicule ?? '' }}</span>
            <span class="flex items-center gap-2 shrink-0 text-muted-foreground">
              <template v-if="v.chargeUtileKg">{{ v.chargeUtileKg.toLocaleString('fr-FR') }} kg</template>
              <template v-if="v.volumeM3"> · {{ v.volumeM3.toLocaleString('fr-FR') }} m³</template>
              <template v-if="v.pompe"> · Pompe</template>
              <button class="text-[11px] text-danger hover:underline bg-transparent border-0 cursor-pointer" @click="resultat(store.retirerVehicule(item.id, v.id), 'Véhicule retiré.')">Retirer</button>
            </span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr_1fr_auto_auto] gap-2 items-end mt-3 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Immatriculation *</label><input v-model="nvVehicule.immatriculation" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Type de véhicule</label><input v-model="nvVehicule.typeVehicule" list="types-vehicules-transporteur" :class="F.fieldInput" />
              <datalist id="types-vehicules-transporteur"><option v-for="t in typesVeh.types" :key="t.code" :value="t.libelle" /></datalist></div>
            <div :class="F.field"><label :class="F.fieldLabel">Charge utile (kg)</label><input v-model.number="nvVehicule.chargeUtileKg" type="number" min="0" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Volume (m³)</label><input v-model.number="nvVehicule.volumeM3" type="number" min="0" :class="F.fieldInput" /></div>
            <label class="flex items-center gap-1.5 text-[12px] pb-2"><input v-model="nvVehicule.pompe" type="checkbox" class="accent-primary" /> Pompe</label>
            <button :class="F.btnOutline" @click="ajouterVehicule">Ajouter</button>
          </div>
        </FormSection>

        <FormSection v-if="estTransporteur" title="Conducteurs" :recaps="[`${item.conducteurs?.length ?? 0} conducteur(s)`]" :default-open="true">
          <div v-if="!item.conducteurs?.length" class="text-xs text-muted-foreground mb-2">Aucun conducteur.</div>
          <div v-for="c in item.conducteurs ?? []" :key="c.id" class="flex items-center justify-between gap-2 py-1.5 border-b border-border/60 text-xs">
            <span>{{ c.nom }}</span>
            <span class="flex items-center gap-2 shrink-0 text-muted-foreground">
              {{ c.telephone ?? '' }}
              <button class="text-[11px] text-danger hover:underline bg-transparent border-0 cursor-pointer" @click="resultat(store.retirerConducteur(item.id, c.id), 'Conducteur retiré.')">Retirer</button>
            </span>
          </div>
          <div class="grid grid-cols-[2fr_1fr_auto] gap-2 items-end mt-3 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Nom *</label><input v-model="nvConducteur.nom" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Téléphone</label><input v-model="nvConducteur.telephone" :class="F.fieldInput" /></div>
            <button :class="F.btnOutline" @click="ajouterConducteur">Ajouter</button>
          </div>
        </FormSection>

        <FormSection v-if="estTransporteur" title="Factures" :recaps="[`${factures.length} facture(s)`]" :default-open="true">
          <div v-if="!factures.length && !saisieFacture" class="text-xs text-muted-foreground mb-2">Aucune facture.</div>
          <div v-for="f in factures" :key="f.id" class="rounded-md border px-3 py-2 mb-2 text-xs" :class="voyagesStore.rapprochementFacture(f.voyageIds, f.montantTotal).horsTolerance && f.statut === 'a_controler' ? 'border-danger/40 bg-danger-bg/40' : 'border-border'" data-facture-transporteur>
            <template v-for="r in [voyagesStore.rapprochementFacture(f.voyageIds, f.montantTotal)]" :key="f.id + '-r'">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono font-semibold">{{ f.numero }}</span>
                <span class="text-muted-foreground">{{ formatDate(f.date) }}</span>
                <span>{{ fmtMontant(f.montantTotal) }}</span>
                <span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="f.statut === 'validee' ? 'bg-success-bg text-success' : f.statut === 'refusee' ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'">{{ LIB_FACTURE[f.statut] }}</span>
              </div>
              <table class="w-full mt-1.5">
                <thead><tr class="text-[10px] text-muted-foreground uppercase text-left"><th class="font-semibold py-0.5">Expédition</th><th class="font-semibold">Statut de livraison</th><th class="font-semibold text-right">Montant convenu</th></tr></thead>
                <tbody>
                  <tr v-for="l in r.lignes" :key="l.voyage.id" class="border-t border-border/60">
                    <td class="py-0.5 font-mono">{{ l.voyage.id }}</td>
                    <td :class="l.terminee ? '' : 'text-warning'">{{ STATUTS_VOYAGE[l.voyage.statut].label }}<template v-if="!l.terminee"> · non terminée</template></td>
                    <td class="text-right">{{ l.convenu != null ? fmtMontant(l.convenu) : 'Aucune grille tarifaire' }}</td>
                  </tr>
                  <tr class="border-t border-border font-semibold"><td class="py-0.5" colspan="2">Total convenu</td><td class="text-right">{{ fmtMontant(r.totalConvenu) }}</td></tr>
                </tbody>
              </table>
              <p v-if="r.ecart" class="mt-1" :class="r.horsTolerance ? 'text-danger' : 'text-muted-foreground'">Écart avec le total convenu : {{ ecartTexte(r.ecart) }}<template v-if="!r.horsTolerance && !r.sansTarif">, dans l'écart toléré</template></p>
              <p v-if="f.motifValidationSansTarif" class="text-muted-foreground">Validée sans grille tarifaire : {{ f.motifValidationSansTarif }}</p>
              <p v-if="f.motifRefus" class="text-danger">Refusée : {{ f.motifRefus }}</p>
              <p v-if="f.decideeLe" class="text-[11px] text-muted-foreground">{{ f.statut === 'validee' ? 'Validée' : 'Refusée' }} le {{ fmtDateHeure(f.decideeLe) }} par {{ f.decideePar }}</p>
              <div v-if="peutControler && f.statut === 'a_controler'" class="flex items-center gap-2 mt-2 flex-wrap">
                <input v-if="r.sansTarif && sansTarifPermis" v-model="motifsSansTarif[f.id]" :class="F.fieldInput" class="!h-[30px] !text-[12px] w-full" placeholder="Motif de la validation sans grille tarifaire (obligatoire)…" />
                <button :class="F.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="validerFacture(f.id)">Valider la facture</button>
                <input v-model="motifsRefus[f.id]" :class="F.fieldInput" class="!h-[30px] !text-[12px] flex-1 min-w-[200px]" placeholder="Motif du refus…" />
                <button :class="F.btnOutline" class="!py-1 !px-2.5 !text-[11px] !text-danger" :disabled="!motifsRefus[f.id]?.trim()" @click="refuserFacture(f.id)">Refuser</button>
              </div>
            </template>
          </div>
          <button v-if="peutControler && !saisieFacture" :class="F.btnOutline" class="mt-1" @click="ouvrirSaisieFacture">Saisir une facture</button>
          <div v-if="saisieFacture && rapprochementSaisie" class="rounded-md border border-border px-3 py-2 mt-1 text-xs" data-saisie-facture-transporteur>
            <div class="grid grid-cols-3 gap-2 items-end max-sm:grid-cols-1">
              <div :class="F.field"><label :class="F.fieldLabel">Numéro *</label><input v-model="saisieFacture.numero" :class="F.fieldInput" /></div>
              <div :class="F.field"><label :class="F.fieldLabel">Date *</label><input v-model="saisieFacture.date" type="date" :max="aujourdhuiISO()" :class="F.fieldInput" /></div>
              <div :class="F.field"><label :class="F.fieldLabel">Montant total ({{ $devise() }}) *</label><input v-model.number="saisieFacture.montant" type="number" min="0" :class="F.fieldInput" /></div>
            </div>
            <p class="text-[11px] font-semibold text-muted-foreground uppercase mt-3 mb-1">Expéditions couvertes</p>
            <div v-if="!expeditions.length" class="text-muted-foreground">Aucune expédition confiée à ce transporteur.</div>
            <label v-for="v in expeditions" :key="v.id" class="flex items-center gap-2 py-1 border-b border-border/60" :class="dejaFacturee(v) ? 'opacity-60' : 'cursor-pointer'">
              <input v-model="saisieFacture.voyageIds" type="checkbox" :value="v.id" :disabled="!!dejaFacturee(v)" class="accent-primary" />
              <span class="font-mono">{{ v.id }}</span>
              <span class="flex-1 min-w-0 truncate">{{ v.clientNom }}</span>
              <span :class="dejaFacturee(v) || ['livre', 'cloture'].includes(v.statut) || (v.statut === 'annule' && v.etapes.some(e => e.livreParChauffeurLe)) ? '' : 'text-warning'">{{ STATUTS_VOYAGE[v.statut].label }}</span>
              <span class="w-[130px] text-right">{{ dejaFacturee(v) ? `Facture ${dejaFacturee(v)}` : (voyagesStore.montantAttenduTransporteur(v) ? fmtMontant(voyagesStore.montantAttenduTransporteur(v)!.montant) : 'Aucune grille tarifaire') }}</span>
            </label>
            <div v-if="rapprochementSaisie.lignes.length" class="mt-2">
              <p>Total convenu : <span class="font-semibold">{{ fmtMontant(rapprochementSaisie.totalConvenu) }}</span><template v-if="rapprochementSaisie.sansTarif"> ({{ rapprochementSaisie.sansTarif }} expédition(s) sans grille tarifaire)</template></p>
              <p v-if="rapprochementSaisie.ecart" :class="rapprochementSaisie.horsTolerance ? 'text-danger' : 'text-muted-foreground'">Écart avec le total convenu : {{ ecartTexte(rapprochementSaisie.ecart) }}<template v-if="!rapprochementSaisie.horsTolerance && !rapprochementSaisie.sansTarif">, dans l'écart toléré</template></p>
              <p v-if="rapprochementSaisie.nonTerminees" class="text-warning">{{ rapprochementSaisie.nonTerminees }} expédition(s) non terminée(s)</p>
            </div>
            <div class="flex justify-end gap-2 mt-3">
              <button :class="F.btnOutline" @click="saisieFacture = null">Renoncer</button>
              <button :class="F.btnPrimary" @click="enregistrerFacture">Enregistrer</button>
            </div>
          </div>
        </FormSection>

        <FormSection title="Contrats" :recaps="[`${item.contrats?.length ?? 0} contrat(s)`]" :default-open="true">
          <div v-if="!item.contrats?.length" class="text-xs text-muted-foreground mb-2">Aucun contrat.</div>
          <div v-for="c in item.contrats ?? []" :key="c.id" class="flex items-center justify-between gap-2 py-1.5 border-b border-border/60 text-xs">
            <span class="min-w-0"><span class="font-mono text-[11px] mr-1.5">{{ c.id }}</span>{{ c.objet }}</span>
            <span class="flex items-center gap-2 shrink-0 text-muted-foreground">
              {{ formatDate(c.debut) }}{{ c.fin ? ` au ${formatDate(c.fin)}` : '' }}<template v-if="c.montantAr"> · {{ c.montantAr.toLocaleString('fr-FR') }} {{ $devise() }}</template>
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="etatContrat(c) === 'En cours' ? 'bg-success-bg text-success' : 'bg-neutral-bg text-neutral'">{{ etatContrat(c) }}</span>
            </span>
          </div>
          <div class="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end mt-3 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Objet *</label><input v-model="nouveauContrat.objet" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Début *</label><input v-model="nouveauContrat.debut" type="date" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Fin</label><input v-model="nouveauContrat.fin" type="date" :class="F.fieldInput" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Montant ({{ $devise() }})</label><input v-model.number="nouveauContrat.montantAr" type="number" min="0" :class="F.fieldInput" /></div>
            <button :class="F.btnOutline" @click="ajouterContrat">Ajouter</button>
          </div>
        </FormSection>

        <FormSection title="Autorisation" :recaps="[item.autorise ? 'Autorisé' : 'Non autorisé']" :default-open="true">
          <template v-if="item.autorise">
            <div :class="F.field"><label :class="F.fieldLabel">Motif du retrait *</label><textarea v-model="motifRetrait" rows="2" :class="F.fieldTextarea"></textarea></div>
            <button :class="F.btnOutline" class="mt-3 !text-danger" @click="retirerAutorisation">Ne plus autoriser ce prestataire</button>
          </template>
          <template v-else>
            <ChampLecture libelle="Motif" large>{{ item.motifNonAutorise ?? '-' }}</ChampLecture>
            <button :class="F.btnOutline" class="mt-3" @click="retablir">Autoriser de nouveau</button>
          </template>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
