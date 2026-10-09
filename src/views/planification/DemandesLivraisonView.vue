<template>
  <div class="h-full overflow-y-auto">
    <div class="w-full max-w-5xl mx-auto px-6 py-6 max-[640px]:px-4">
      <div :class="L.pageTitle">Demandes de livraison</div>
      <div :class="L.pageSub">J'exprime le besoin du client auprès du planificateur, puis je suis chaque demande jusqu'à la livraison.</div>

      <!-- Compteurs -->
      <div class="grid grid-cols-4 gap-3 mt-5 max-[760px]:grid-cols-2">
        <div v-for="k in compteurs" :key="k.libelle" :class="L.card" class="!py-3">
          <p class="text-[11px] text-muted-foreground uppercase tracking-[0.04em]">{{ k.libelle }}</p>
          <p class="text-2xl font-bold" :class="k.cls">{{ k.valeur }}</p>
        </div>
      </div>

      <!-- Nouvelle demande / modification -->
      <div :class="L.card" class="mt-5">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p class="text-sm font-semibold text-foreground">{{ enEdition ? 'Corriger la demande' : 'Nouvelle demande' }}</p>
          <div class="flex items-center gap-1.5">
            <button :class="form.type === 'client' ? cls.btnPrimary : cls.btnOutline" class="!py-1.5 !text-[12px]" @click="form.type = 'client'"><Package class="w-3.5 h-3.5" /> Livraison client</button>
            <button :class="form.type === 'transfert' ? cls.btnPrimary : cls.btnOutline" class="!py-1.5 !text-[12px]" @click="form.type = 'transfert'"><Truck class="w-3.5 h-3.5" /> Transfert entre sites</button>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="form.type === 'client'" class="flex flex-col gap-1.5">
            <label :class="lbl">Client</label>
            <input v-model="form.destinataire" :class="cls.fieldInput" list="liste-clients" placeholder="Nom du client…" />
            <datalist id="liste-clients"><option v-for="c in clientsStore.clients" :key="c.id" :value="c.nom" /></datalist>
          </div>
          <div v-else class="flex flex-col gap-1.5">
            <label :class="lbl">Site destinataire</label>
            <SearchableDropdown v-model="form.siteId" :items="optSites" placeholder="Choisir un site…" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="lbl">Adresse de livraison</label>
            <input v-model="form.adresse" :class="cls.fieldInput" placeholder="Adresse…" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="lbl">{{ prm.libelleReferenceExterne }}{{ prm.referenceExterneObligatoire ? '' : ' (facultatif)' }}</label>
            <input v-model="form.referenceExterne" :class="cls.fieldInput" placeholder="Référence dans votre système de gestion…" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="lbl">Date de livraison souhaitée</label>
            <input v-model="form.dateSouhaitee" type="date" :class="cls.fieldInput" />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label :class="lbl">Contenu</label>
            <input v-model="form.contenu" :class="cls.fieldInput" placeholder="Articles à livrer, séparés par une virgule…" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="lbl">Nombre de {{ prm.uniteComptage }}</label>
            <input v-model.number="form.nombreUnites" type="number" min="0" :class="cls.fieldInput" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="lbl">Poids total (kg)</label>
            <input v-model.number="form.poidsKg" type="number" min="1" :class="cls.fieldInput" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="lbl">Volume (m³, facultatif)</label>
            <input v-model.number="form.volumeM3" type="number" min="0" step="0.1" :class="cls.fieldInput" />
          </div>
          <div v-if="form.type === 'client'" class="flex flex-col gap-1.5">
            <label :class="lbl">Notifications du client</label>
            <select v-model="form.canal" :class="cls.fieldInput"><option v-for="(lib, k) in LIB_CANAL" :key="k" :value="k">{{ lib }}</option></select>
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label :class="lbl">Commentaire pour le planificateur (facultatif)</label>
            <input v-model="form.commentaire" :class="cls.fieldInput" placeholder="Horaires d'ouverture, accès, contact sur place…" />
          </div>
        </div>
        <p v-if="erreur" class="text-[12px] text-danger mt-3">{{ erreur }}</p>
        <div class="flex justify-end gap-2 mt-3">
          <button v-if="enEdition" :class="cls.btnOutline" @click="reinitialiserForm">Renoncer</button>
          <button :class="cls.btnPrimary" @click="envoyer"><Send class="w-4 h-4" /> {{ enEdition ? 'Renvoyer au planificateur' : 'Envoyer au planificateur' }}</button>
        </div>
      </div>

      <!-- Suivi -->
      <div class="flex items-center justify-between mt-6 mb-2 flex-wrap gap-2">
        <h2 class="text-sm font-semibold text-foreground">Suivi des demandes</h2>
        <div class="flex items-center gap-1.5">
          <button v-for="f in FILTRES" :key="f.cle" class="px-2.5 py-1 rounded-md text-[12px] border-0 cursor-pointer"
                  :class="filtre === f.cle ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-card'" @click="filtre = f.cle">{{ f.libelle }}</button>
        </div>
      </div>
      <div v-if="!demandesFiltrees.length" :class="L.card" class="text-center py-6 text-[13px] text-muted-foreground italic">Aucune demande.</div>
      <div v-for="c in demandesFiltrees" :key="c.id" :class="L.card" class="mb-2.5">
        <div class="flex items-start gap-3 flex-wrap">
          <div class="flex-1 min-w-[220px]">
            <p class="text-[13px] font-medium text-foreground break-words">{{ c.destinataire }} <span class="text-[11px] font-mono text-muted-foreground">· {{ c.referenceExterne || c.id }}</span></p>
            <p class="text-[11px] text-muted-foreground break-words">{{ c.adresseLivraison }} · {{ c.contenu }} · {{ c.nombreUnites ?? 0 }} {{ prm.uniteComptage }} · {{ c.poidsKg.toLocaleString('fr-FR') }} kg · souhaitée le {{ fmtJour(c.dateSouhaitee) }}</p>
            <p class="text-[11px] text-muted-foreground">Émise par {{ c.emisPar ?? 'système de gestion' }} le {{ fmtJour(c.createdAt) }}</p>
          </div>
          <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" :class="suivi(c).cls">{{ suivi(c).libelle }}</span>
        </div>
        <p v-if="suivi(c).detail" class="text-[12px] mt-2" :class="c.statut === 'rejetee' ? 'text-danger' : 'text-muted-foreground'">{{ suivi(c).detail }}</p>

        <div v-if="(c.statut === 'en_attente' || c.statut === 'rejetee') && annulationOuverte !== c.id" class="flex items-center gap-3 mt-2.5 flex-wrap">
          <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="editer(c)">{{ c.statut === 'rejetee' ? 'Corriger et renvoyer' : 'Modifier' }}</button>
          <button class="text-[11px] text-danger underline bg-transparent border-0 cursor-pointer p-0" @click="annulationOuverte = c.id; motifAnnulation = ''">Annuler la demande</button>
        </div>
        <div v-if="annulationOuverte === c.id" class="flex items-center gap-2 mt-2.5 flex-wrap">
          <input v-model="motifAnnulation" :class="cls.fieldInput" class="!h-[32px] !text-[12px] flex-1 min-w-[220px]" placeholder="Pourquoi annuler cette demande ?…" />
          <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="annulationOuverte = null">Renoncer</button>
          <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90 !py-1 !px-2.5 !text-[11px]" :disabled="!motifAnnulation.trim()" @click="annuler(c.id)">Confirmer l'annulation</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Espace de l'émetteur des demandes de livraison (l'équipe commerciale chez
 * UCODIS, mais le rôle émetteur se paramètre par entreprise). Le
 * planificateur ne crée jamais un ordre de transport sans besoin exprimé :
 * c'est ici que ce besoin naît, avec sa référence dans le système de
 * gestion de l'entreprise, puis se suit jusqu'à la confirmation du client.
 */
import { computed, ref, watch } from 'vue'
import { Package, Truck, Send } from '@lucide/vue'
import { useCommandesStore } from '../../stores/commandes'
import { useVoyagesStore } from '../../stores/voyages'
import { useClientsStore, LIB_CANAL, type CanalNotification } from '../../stores/clients'
import { useSitesStore } from '../../stores/sites'
import { useAuthStore } from '../../stores/auth'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import { STATUTS_VOYAGE, horsTournee } from '../../utils/voyageUtils'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import * as L from '../../lib/listClasses'
import * as cls from '../../lib/formClasses'
import type { Commande } from '../../types'

const commandes = useCommandesStore()
const voyages = useVoyagesStore()
const clientsStore = useClientsStore()
const sitesStore = useSitesStore()
const auth = useAuthStore()
const prm = computed(() => useParametresPlanificationStore().parametres)
const lbl = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]'
const optSites = computed<DropdownItem[]>(() => sitesStore.sites.map(s => ({ id: s.id, label: s.nom })))
function fmtJour(iso?: string) { return iso ? new Date(iso).toLocaleDateString('fr-FR') : '' }

/* ── Formulaire ── */
const vide = () => ({ type: 'client' as 'client' | 'transfert', destinataire: '', siteId: '', adresse: '', referenceExterne: '', dateSouhaitee: '',
  contenu: '', nombreUnites: undefined as number | undefined, poidsKg: undefined as number | undefined, volumeM3: undefined as number | undefined,
  canal: 'sms' as CanalNotification, commentaire: '' })
const form = ref(vide())
const enEdition = ref<string | null>(null)
const erreur = ref('')
watch(() => form.value.destinataire, nom => { if (!enEdition.value) form.value.canal = clientsStore.canalPour(nom.trim()) })
function reinitialiserForm() { form.value = vide(); enEdition.value = null; erreur.value = '' }

function positionSimulee() {
  const base = sitesStore.sites.find(s => s.code === 'DEP-TNJ')
  return { lat: (base?.lat ?? -18.8792) + (Math.random() - 0.5) * 0.6, lng: (base?.lng ?? 47.5079) + (Math.random() - 0.5) * 0.6 }
}
function envoyer() {
  const f = form.value
  erreur.value = ''
  const site = f.type === 'transfert' ? sitesStore.sites.find(s => s.id === f.siteId) : null
  if (f.type === 'client' ? !f.destinataire.trim() : !site) { erreur.value = 'Indiquez le destinataire.'; return }
  if (!f.adresse.trim() && f.type === 'client') { erreur.value = "Indiquez l'adresse de livraison."; return }
  if (prm.value.referenceExterneObligatoire && !f.referenceExterne.trim()) { erreur.value = `Indiquez le ${prm.value.libelleReferenceExterne.toLowerCase()}.`; return }
  if (!f.dateSouhaitee) { erreur.value = 'Indiquez la date de livraison souhaitée.'; return }
  if (!f.contenu.trim()) { erreur.value = 'Indiquez le contenu à livrer.'; return }
  if (!f.poidsKg || f.poidsKg <= 0) { erreur.value = 'Indiquez le poids total, indispensable pour choisir le camion.'; return }
  const donnees = {
    destinataire: site ? site.nom : f.destinataire.trim(), adresseLivraison: site ? (f.adresse.trim() || site.nom) : f.adresse.trim(),
    siteId: site?.id, contenu: f.contenu.trim(), poidsKg: f.poidsKg, volumeM3: f.volumeM3, nombreUnites: f.nombreUnites,
    dateSouhaitee: f.dateSouhaitee, referenceExterne: f.referenceExterne.trim() || undefined, commentaire: f.commentaire.trim() || undefined,
    canalNotification: f.type === 'client' ? f.canal : undefined,
  }
  if (enEdition.value) {
    const res = commandes.modifier(enEdition.value, donnees)
    if (!res.ok) { erreur.value = res.motif ?? ''; return }
  } else {
    const pos = site ? { lat: site.lat, lng: site.lng } : positionSimulee()
    commandes.creer({ ...donnees, ...pos, emisPar: auth.user?.nom, emisParRole: auth.role ?? undefined, origine: 'demande' })
  }
  reinitialiserForm()
}
function editer(c: Commande) {
  enEdition.value = c.id
  form.value = { type: c.siteId ? 'transfert' : 'client', destinataire: c.siteId ? '' : c.destinataire, siteId: c.siteId ?? '',
    adresse: c.adresseLivraison, referenceExterne: c.referenceExterne ?? '', dateSouhaitee: c.dateSouhaitee, contenu: c.contenu,
    nombreUnites: c.nombreUnites, poidsKg: c.poidsKg, volumeM3: c.volumeM3, canal: c.canalNotification ?? 'sms', commentaire: c.commentaire ?? '' }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* ── Annulation ── */
const annulationOuverte = ref<string | null>(null)
const motifAnnulation = ref('')
function annuler(id: string) {
  const res = commandes.annuler(id, motifAnnulation.value)
  if (!res.ok) { alert(res.motif); return }
  annulationOuverte.value = null
}

/* ── Suivi : où en est chaque demande, jusqu'à la confirmation du client ── */
function suivi(c: Commande): { libelle: string; cls: string; detail?: string } {
  if (c.statut === 'en_attente') return { libelle: "En attente d'un ordre", cls: 'bg-warning-bg text-warning', detail: c.commentaire ? `Commentaire : ${c.commentaire}` : undefined }
  if (c.statut === 'rejetee') return { libelle: 'Rejetée', cls: 'bg-danger-bg text-danger', detail: `Rejetée par ${c.rejeteePar ?? 'le planificateur'} le ${fmtJour(c.rejeteeLe)} : ${c.motifRejet}. Corrigez-la puis renvoyez-la, ou annulez-la.` }
  if (c.statut === 'annulee') return { libelle: 'Annulée', cls: 'bg-neutral-bg text-neutral', detail: `Annulée le ${fmtJour(c.annuleeLe)} : ${c.motifAnnulation}` }
  const v = c.voyageId ? voyages.getById(c.voyageId) : undefined
  const l = v?.etapes.find(e => e.commandeId === c.id)
  if (!v || !l) return { libelle: 'Planifiée', cls: 'bg-info-bg text-info' }
  const ordre = `${v.numeroOT || v.reference}, le ${fmtJour(v.datePlanifiee)}${v.vehiculePlaque ? `, camion ${v.vehiculePlaque}` : ''} (${STATUTS_VOYAGE[v.statut]?.label ?? v.statut})`
  if (l.receptionConfirmeeClientLe) return { libelle: 'Livrée et confirmée', cls: 'bg-success-bg text-success', detail: `Réception confirmée par le client le ${fmtJour(l.receptionConfirmeeClientLe)}. Ordre ${ordre}.` }
  if (l.receptionContesteeLe) return { libelle: 'Contestée', cls: 'bg-danger-bg text-danger', detail: `Le client conteste la livraison : ${l.motifContestation}. Ordre ${ordre}.` }
  if (l.livreParChauffeurLe) return { libelle: 'Livrée', cls: 'bg-success-bg text-success', detail: `Livraison déclarée par le chauffeur, en attente de la confirmation du client. Ordre ${ordre}.` }
  if (l.ligneAnnuleeLe) return { libelle: 'Refusée par le client', cls: 'bg-danger-bg text-danger', detail: `${l.motifAnnulationLigne ?? ''} Ordre ${ordre}.` }
  if (horsTournee(l)) return { libelle: 'À replanifier', cls: 'bg-warning-bg text-warning', detail: `Sortie de la tournée (client indisponible, non-conformité au chargement ou report demandé sur place), en cours de replanification. Ordre ${ordre}.` }
  if (l.reporteLe) return { libelle: 'Reportée', cls: 'bg-warning-bg text-warning', detail: `Livraison reportée dans la tournée : ${l.motifReport ?? ''}. Ordre ${ordre}.` }
  return { libelle: 'Planifiée', cls: 'bg-info-bg text-info', detail: `Dans l'ordre ${ordre}.` }
}

const FILTRES = [{ cle: 'toutes', libelle: 'Toutes' }, { cle: 'attente', libelle: 'En attente' }, { cle: 'planifiees', libelle: 'Planifiées' }, { cle: 'rejetees', libelle: 'Rejetées' }] as const
const filtre = ref<typeof FILTRES[number]['cle']>('toutes')
const demandes = computed(() => [...commandes.commandes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
const demandesFiltrees = computed(() => demandes.value.filter(c =>
  filtre.value === 'toutes' ? true : filtre.value === 'attente' ? c.statut === 'en_attente' : filtre.value === 'planifiees' ? c.statut === 'affectee' : c.statut === 'rejetee'))
const compteurs = computed(() => [
  { libelle: "En attente d'un ordre", valeur: demandes.value.filter(c => c.statut === 'en_attente').length, cls: 'text-warning' },
  { libelle: 'Planifiées', valeur: demandes.value.filter(c => c.statut === 'affectee').length, cls: 'text-info' },
  { libelle: 'Rejetées', valeur: demandes.value.filter(c => c.statut === 'rejetee').length, cls: 'text-danger' },
  { libelle: 'Livrées et confirmées', valeur: demandes.value.filter(c => suivi(c).libelle === 'Livrée et confirmée').length, cls: 'text-success' },
])
</script>
