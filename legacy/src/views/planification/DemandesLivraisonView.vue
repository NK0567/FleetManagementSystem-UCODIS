<template>
  <div class="h-full overflow-y-auto">
    <div class="w-full max-w-5xl mx-auto px-6 py-6 max-[640px]:px-4">
      <div :class="L.pageTitle">Demandes de livraison</div>

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
            <datalist id="liste-clients"><option v-for="c in clientsStore.destinataires()" :key="c.id" :value="c.nom" /></datalist>
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
          <template v-if="form.type === 'client'">
            <div class="flex flex-col gap-1.5">
              <label :class="lbl">Téléphone du destinataire (facultatif)</label>
              <input v-model="form.telephone" :class="cls.fieldInput" placeholder="Sinon celui de la fiche client" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label :class="lbl">E-mail du destinataire (facultatif)</label>
              <input v-model="form.email" :class="cls.fieldInput" placeholder="Sinon celui de la fiche client" />
            </div>
          </template>
          <div v-if="form.type === 'client'" class="flex flex-col gap-1.5">
            <label :class="lbl">Notifications du client</label>
            <select v-model="form.canal" :class="cls.fieldInput"><option v-for="(lib, k) in LIB_CANAL" :key="k" :value="k">{{ lib }}</option></select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="lbl">Marchandises</label>
            <select v-model="form.confiees" :class="cls.fieldInput">
              <option :value="false">De l'entreprise</option>
              <option :value="true">Confiées par un client</option>
            </select>
          </div>
          <div v-if="form.confiees" class="flex flex-col gap-1.5">
            <label :class="lbl">Client qui confie les marchandises</label>
            <input v-model="form.ordonnateurExterne" :class="cls.fieldInput" list="liste-ordonnateurs" placeholder="Nom du client…" />
            <datalist id="liste-ordonnateurs"><option v-for="c in clientsStore.ordonnateurs('externe')" :key="c.id" :value="c.nom" /></datalist>
          </div>
          <div class="flex flex-col gap-1.5">
            <label :class="lbl">Fret à la charge de</label>
            <select v-model="form.fret" :class="cls.fieldInput"><option value="ordonnateur">L'ordonnateur</option><option value="destinataire">Le destinataire</option></select>
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
            <p class="text-[11px] text-muted-foreground break-words">{{ c.adresseLivraison }} · {{ c.contenuInitial ?? c.contenu }} · {{ total(c).nombreUnites }} {{ prm.uniteComptage }} · {{ total(c).poidsKg.toLocaleString('fr-FR') }} kg<template v-if="total(c).volumeL"> · {{ total(c).volumeL.toLocaleString('fr-FR') }} L</template> · souhaitée le {{ fmtJour(c.dateSouhaitee) }}</p>
            <p class="text-[11px] text-muted-foreground">Envoyée le {{ fmtJour(c.createdAt) }}<template v-if="c.ordonnateurExterne"> · marchandises confiées par {{ c.ordonnateurExterne }}</template></p>
          </div>
          <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" :class="suivi(c).cls">{{ suivi(c).libelle }}</span>
        </div>
        <p v-if="suivi(c).detail" class="text-[12px] mt-2" :class="c.statut === 'rejetee' ? 'text-danger' : 'text-muted-foreground'">{{ suivi(c).detail }}</p>
        <!-- Commande répartie : chaque part a sa livraison et son état -->
        <div v-if="parts(c).length > 1" class="mt-2 flex flex-col gap-1" data-parts>
          <div v-for="(x, k) in parts(c)" :key="x.id" class="flex items-start gap-2 text-[12px] rounded-md bg-background px-2.5 py-1.5">
            <span class="font-medium text-foreground shrink-0">Part {{ k + 1 }}</span>
            <span class="flex-1 min-w-0 text-muted-foreground break-words">{{ quantitePart(x) }}<template v-if="suiviPart(x).detail"> · {{ suiviPart(x).detail }}</template></span>
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" :class="suiviPart(x).cls">{{ suiviPart(x).libelle }}</span>
          </div>
        </div>

        <div v-if="(c.statut === 'en_attente' || c.statut === 'rejetee') && parts(c).length < 2 && annulationOuverte !== c.id" class="flex items-center gap-3 mt-2.5 flex-wrap">
          <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="editer(c)">{{ c.statut === 'rejetee' ? 'Corriger et renvoyer' : 'Modifier' }}</button>
          <button class="text-[11px] text-danger underline bg-transparent border-0 cursor-pointer p-0" @click="annulationOuverte = c.id; motifAnnulation = ''">Annuler la demande</button>
        </div>
        <div v-if="annulationOuverte === c.id" class="flex items-center gap-2 mt-2.5 flex-wrap">
          <input v-model="motifAnnulation" :class="cls.fieldInput" class="!h-[32px] !text-[12px] flex-1 min-w-[220px]" placeholder="Pourquoi annuler cette demande ?…" />
          <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="annulationOuverte = null">Renoncer</button>
          <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90 !py-1 !px-2.5 !text-[11px]" :disabled="!motifAnnulation.trim()" @click="annuler(c.id)">Confirmer l'annulation</button>
        </div>
        <p v-if="annulationOuverte === c.id && erreurAnnulation" class="text-[12px] text-danger mt-1.5">{{ erreurAnnulation }}</p>

        <!-- Enquête sur l'exécution de la demande, une fois l'expédition terminée -->
        <div v-if="c.enqueteOrdonnateur" class="mt-2.5 pt-2.5 border-t border-border">
          <p class="text-[12px] font-medium text-foreground mb-1.5">Votre avis sur l'exécution</p>
          <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12px]">
            <template v-for="q in QUESTIONS_ENQUETE" :key="q.cle">
              <span class="text-muted-foreground">{{ q.libelle }}</span>
              <span class="flex items-center gap-0.5"><Star v-for="n in 5" :key="n" class="w-3.5 h-3.5" :class="n <= c.enqueteOrdonnateur[q.cle] ? 'fill-yellow-400 text-yellow-400' : 'text-border'" /></span>
            </template>
          </div>
          <p v-if="c.enqueteOrdonnateur.commentaire" class="text-[12px] text-muted-foreground italic mt-1">« {{ c.enqueteOrdonnateur.commentaire }} »</p>
        </div>
        <div v-else-if="commandes.enqueteProposee(c.id)" class="mt-2.5 pt-2.5 border-t border-border">
          <button v-if="enqueteOuverte !== c.id" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0" @click="ouvrirEnquete(c.id)">Donner mon avis sur l'exécution (facultatif)</button>
          <div v-else class="flex flex-col gap-2">
            <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 items-center text-[12px]">
              <template v-for="q in QUESTIONS_ENQUETE" :key="q.cle">
                <span class="text-muted-foreground">{{ q.libelle }}</span>
                <span class="flex items-center gap-0.5">
                  <button v-for="n in 5" :key="n" class="bg-transparent border-0 cursor-pointer p-0.5" :title="`${n} sur 5`" @click="notes[q.cle] = n">
                    <Star class="w-5 h-5" :class="n <= notes[q.cle] ? 'fill-yellow-400 text-yellow-400' : 'text-border'" />
                  </button>
                </span>
              </template>
            </div>
            <textarea v-model="commentaireEnquete" rows="2" :class="cls.fieldTextarea" placeholder="Un commentaire (facultatif)…"></textarea>
            <p v-if="erreurEnquete" class="text-[12px] text-danger">{{ erreurEnquete }}</p>
            <div class="flex items-center gap-2 justify-end">
              <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="enqueteOuverte = null">Renoncer</button>
              <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="envoyerEnquete(c.id)">Envoyer mon avis</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Espace de l'ordonnateur (rôles réglés dans les paramètres de la
 * planification) : il adresse le besoin d'un client au planificateur, avec
 * sa référence dans le système de gestion de l'entreprise, puis suit ses
 * propres demandes jusqu'à la confirmation du client.
 */
import { computed, ref, watch } from 'vue'
import { Package, Truck, Send, Star } from '@lucide/vue'
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
  canal: 'sms' as CanalNotification, commentaire: '', confiees: false, ordonnateurExterne: '', telephone: '', email: '',
  fret: useParametresPlanificationStore().parametres.fretALaChargeDefaut as 'ordonnateur' | 'destinataire' })
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
  if (f.nombreUnites != null && (f.nombreUnites < 0 || !Number.isInteger(f.nombreUnites))) { erreur.value = `Le nombre de ${prm.value.uniteComptage} doit être un entier positif.`; return }
  if (f.volumeM3 != null && f.volumeM3 < 0) { erreur.value = 'Le volume ne peut pas être négatif.'; return }
  if (f.confiees && !f.ordonnateurExterne.trim()) { erreur.value = 'Indiquez le client qui confie les marchandises.'; return }
  const tel = f.type === 'client' ? f.telephone.trim() : '', mail = f.type === 'client' ? f.email.trim() : ''
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { erreur.value = `Adresse e-mail invalide : ${mail}`; return }
  if (tel && !/^[+0-9 ().-]{6,}$/.test(tel)) { erreur.value = `Numéro de téléphone invalide : ${tel}`; return }
  if (!enEdition.value && f.referenceExterne.trim() && commandes.referenceConnue(f.referenceExterne)) { erreur.value = `Une demande porte déjà la référence ${f.referenceExterne.trim()}.`; return }
  const donnees = {
    destinataire: site ? site.nom : f.destinataire.trim(), adresseLivraison: site ? (f.adresse.trim() || site.nom) : f.adresse.trim(),
    siteId: site?.id, contenu: f.contenu.trim(), poidsKg: f.poidsKg, volumeM3: f.volumeM3, nombreUnites: f.nombreUnites,
    dateSouhaitee: f.dateSouhaitee, referenceExterne: f.referenceExterne.trim() || undefined, commentaire: f.commentaire.trim() || undefined,
    canalNotification: f.type === 'client' ? f.canal : undefined,
    ordonnateurExterne: f.confiees ? f.ordonnateurExterne.trim() : undefined,
    telephoneDestinataire: tel || undefined, emailDestinataire: mail || undefined, fretALaCharge: f.fret,
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
    nombreUnites: c.nombreUnites, poidsKg: c.poidsKg, volumeM3: c.volumeM3, canal: c.canalNotification ?? 'sms', commentaire: c.commentaire ?? '',
    confiees: !!c.ordonnateurExterne, ordonnateurExterne: c.ordonnateurExterne ?? '', telephone: c.telephoneDestinataire ?? '', email: c.emailDestinataire ?? '', fret: c.fretALaCharge ?? prm.value.fretALaChargeDefaut }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* ── Annulation ── */
const annulationOuverte = ref<string | null>(null)
const motifAnnulation = ref('')
const erreurAnnulation = ref('')
watch(annulationOuverte, () => { erreurAnnulation.value = '' })
function annuler(id: string) {
  const res = commandes.annuler(id, motifAnnulation.value)
  if (!res.ok) { erreurAnnulation.value = res.motif ?? ''; return }
  annulationOuverte.value = null
}

/* ── Enquête de l'ordonnateur : respect de la demande, délais, qualité ── */
const QUESTIONS_ENQUETE = [
  { cle: 'respectOrdre', libelle: 'Respect de la demande' },
  { cle: 'delais', libelle: 'Respect des délais' },
  { cle: 'qualite', libelle: 'Qualité attendue' },
] as const
const enqueteOuverte = ref<string | null>(null)
const notes = ref({ respectOrdre: 0, delais: 0, qualite: 0 })
const commentaireEnquete = ref('')
const erreurEnquete = ref('')
function ouvrirEnquete(id: string) {
  enqueteOuverte.value = id
  notes.value = { respectOrdre: 0, delais: 0, qualite: 0 }
  commentaireEnquete.value = ''
  erreurEnquete.value = ''
}
function envoyerEnquete(id: string) {
  const res = commandes.repondreEnqueteOrdonnateur(id, { ...notes.value, commentaire: commentaireEnquete.value }, auth.user?.nom ?? '')
  if (!res.ok) { erreurEnquete.value = res.motif ?? ''; return }
  enqueteOuverte.value = null
}

/* ── Suivi : où en est chaque demande, jusqu'à la confirmation du client ── */
/** Parts d'une demande répartie sur plusieurs livraisons (la demande seule sinon). */
const parts = (c: Commande) => commandes.partsDe(c.id)
/** Quantités totales de la demande, toutes parts comprises. */
function total(c: Commande) {
  const ps = parts(c)
  return { poidsKg: ps.reduce((t, x) => t + x.poidsKg, 0), nombreUnites: ps.reduce((t, x) => t + (x.nombreUnites ?? 0), 0), volumeL: ps.reduce((t, x) => t + (x.volumeL ?? 0), 0) }
}
const quantitePart = (x: Commande) => [x.volumeL ? `${x.volumeL.toLocaleString('fr-FR')} L` : null, x.nombreUnites ? `${x.nombreUnites} ${prm.value.uniteComptage}` : null, `${x.poidsKg.toLocaleString('fr-FR')} kg`].filter(Boolean).join(' · ')
/** État global d'une demande répartie : livrée seulement quand toutes ses parts sont réglées. */
function suivi(c: Commande): { libelle: string; cls: string; detail?: string } {
  const ps = parts(c)
  if (ps.length < 2) return suiviPart(c)
  const actives = ps.filter(x => x.statut !== 'annulee')
  const detail = `Commande répartie en ${ps.length} livraisons.`
  if (!actives.length) return { ...suiviPart(ps[0]!), detail }
  const lib = actives.map(x => suiviPart(x).libelle)
  const tous = (l: string[]) => lib.every(x => l.includes(x))
  const un = (l: string) => lib.includes(l)
  const etat = (libelle: string, cls: string) => ({ libelle, cls, detail })
  if (un('Contestée')) return etat('Contestée', 'bg-danger-bg text-danger')
  if (un('Contestation traitée') && tous(['Contestation traitée', 'Livrée et confirmée', 'Livrée', 'Refusée par le client'])) return etat('Contestation traitée', 'bg-neutral-bg text-neutral')
  if (tous(['Livrée et confirmée'])) return etat('Livrée et confirmée', 'bg-success-bg text-success')
  if (tous(['Refusée par le client'])) return etat('Refusée par le client', 'bg-danger-bg text-danger')
  if (tous(['Livrée', 'Livrée et confirmée', 'Refusée par le client'])) return etat('Livrée', 'bg-success-bg text-success')
  if (un('À replanifier')) return etat('À replanifier', 'bg-warning-bg text-warning')
  if (un('Reportée')) return etat('Reportée', 'bg-warning-bg text-warning')
  if (un("En attente d'un ordre")) return etat("En attente d'un ordre", 'bg-warning-bg text-warning')
  return etat('Planifiée', 'bg-info-bg text-info')
}
function suiviPart(c: Commande): { libelle: string; cls: string; detail?: string } {
  if (c.statut === 'en_attente') return { libelle: "En attente d'un ordre", cls: 'bg-warning-bg text-warning', detail: c.commentaire ? `Commentaire : ${c.commentaire}` : undefined }
  if (c.statut === 'rejetee') return { libelle: 'Rejetée', cls: 'bg-danger-bg text-danger', detail: `Rejetée par ${c.rejeteePar ?? 'le planificateur'} le ${fmtJour(c.rejeteeLe)} : ${c.motifRejet}` }
  if (c.statut === 'annulee') return { libelle: 'Annulée', cls: 'bg-neutral-bg text-neutral', detail: `Annulée le ${fmtJour(c.annuleeLe)} : ${c.motifAnnulation}` }
  const v = c.voyageId ? voyages.getById(c.voyageId) : undefined
  const l = v?.etapes.find(e => e.commandeId === c.id)
  if (!v || !l) return { libelle: 'Planifiée', cls: 'bg-info-bg text-info' }
  const ordre = `${v.numeroOT || v.reference}, le ${fmtJour(v.datePlanifiee)}${v.vehiculePlaque ? `, camion ${v.vehiculePlaque}` : ''} (${STATUTS_VOYAGE[v.statut]?.label ?? v.statut})`
  if (l.receptionConfirmeeClientLe) return { libelle: 'Livrée et confirmée', cls: 'bg-success-bg text-success', detail: `Réception confirmée par le client le ${fmtJour(l.receptionConfirmeeClientLe)}. Ordre ${ordre}.` }
  if (l.receptionContesteeLe && l.contestationTraiteeLe) return { libelle: 'Contestation traitée', cls: 'bg-neutral-bg text-neutral', detail: `Contestation traitée le ${fmtJour(l.contestationTraiteeLe)} : ${l.noteTraitementContestation}. Ordre ${ordre}.` }
  if (l.receptionContesteeLe) return { libelle: 'Contestée', cls: 'bg-danger-bg text-danger', detail: `Le client conteste la livraison : ${l.motifContestation}. Ordre ${ordre}.` }
  if (l.livreParChauffeurLe) return { libelle: 'Livrée', cls: 'bg-success-bg text-success', detail: `Livraison déclarée par le conducteur, en attente de la confirmation du client. Ordre ${ordre}.` }
  if (l.ligneAnnuleeLe) return { libelle: 'Refusée par le client', cls: 'bg-danger-bg text-danger', detail: `${l.motifAnnulationLigne ? `Motif : ${l.motifAnnulationLigne}. ` : ''}Ordre ${ordre}.` }
  if (horsTournee(l)) return { libelle: 'À replanifier', cls: 'bg-warning-bg text-warning', detail: `Sortie de la tournée, à replanifier. Ordre ${ordre}.` }
  if (l.reporteLe) return { libelle: 'Reportée', cls: 'bg-warning-bg text-warning', detail: `Livraison reportée dans la tournée : ${l.motifReport ?? ''}. Ordre ${ordre}.` }
  return { libelle: 'Planifiée', cls: 'bg-info-bg text-info', detail: `Dans l'ordre ${ordre}.` }
}

/* Compteurs et filtres sur les demandes de l'ordonnateur connecté seulement. */
const LIVREES = ['Livrée', 'Livrée et confirmée', 'Contestation traitée']
const FILTRES = [{ cle: 'toutes', libelle: 'Toutes' }, { cle: 'attente', libelle: 'En attente' }, { cle: 'planifiees', libelle: 'Planifiées' }, { cle: 'rejetees', libelle: 'Rejetées' }, { cle: 'livrees', libelle: 'Livrées' }] as const
type CleFiltre = typeof FILTRES[number]['cle']
const filtre = ref<CleFiltre>('toutes')
/* Une demande répartie en parts ne compte qu'une fois : sa commande d'origine porte la carte. */
const demandes = computed(() => commandes.commandes
  .filter(c => c.emisPar === auth.user?.nom && commandes.racine(c) === c.id)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
function correspond(c: Commande, f: CleFiltre) {
  if (f === 'toutes') return true
  const lib = suivi(c).libelle
  if (f === 'attente') return lib === "En attente d'un ordre"
  if (f === 'rejetees') return lib === 'Rejetée'
  return f === 'planifiees' ? lib === 'Planifiée' : LIVREES.includes(lib)
}
const demandesFiltrees = computed(() => demandes.value.filter(c => correspond(c, filtre.value)))
const compteurs = computed(() => [
  { libelle: "En attente d'un ordre", valeur: demandes.value.filter(c => correspond(c, 'attente')).length, cls: 'text-warning' },
  { libelle: 'Planifiées', valeur: demandes.value.filter(c => correspond(c, 'planifiees')).length, cls: 'text-info' },
  { libelle: 'Rejetées', valeur: demandes.value.filter(c => correspond(c, 'rejetees')).length, cls: 'text-danger' },
  { libelle: 'Livrées', valeur: demandes.value.filter(c => correspond(c, 'livrees')).length, cls: 'text-success' },
])
</script>
