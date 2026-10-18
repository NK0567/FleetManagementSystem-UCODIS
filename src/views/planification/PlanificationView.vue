<template>
  <div class="h-full flex flex-col px-7 py-6 max-[640px]:px-4">
    <div class="flex items-start justify-between gap-3 mb-4 flex-wrap shrink-0">
      <div>
        <div :class="L.pageTitle">Planification</div>
        <div :class="L.pageSub" class="flex items-center gap-2 flex-wrap">
          <span>{{ voyagesVisibles.length }} ordre(s) de transport<template v-if="commandesStore.enAttenteFret.length"> · {{ commandesStore.enAttenteFret.length }} commande(s) à livrer en attente d'un ordre</template><template v-if="commandesStore.carburantAPlanifier.length"> · {{ commandesStore.carburantAPlanifier.length }} commande(s) de carburant à planifier</template></span>
          <ImportCommandesBouton />
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div :class="L.searchBox" class="!h-[34px]">
          <Search class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input v-model="recherche" type="text" placeholder="Rechercher un ordre, un destinataire, un véhicule…"
                 class="border-0 outline-none bg-transparent text-[13px] w-[260px] max-[640px]:w-[150px]" />
        </div>
        <button :class="[L.tbIconBtn, (filtresOuverts || filtresActifs) && L.tbIconBtnActive]" title="Filtrer" @click="filtresOuverts = !filtresOuverts"><Filter class="w-4 h-4" /></button>
        <RouterLink v-if="peutPiloter" :to="{ name: 'admin-parametres' }" :class="L.tbIconBtn" title="Paramètres"><Settings2 class="w-4 h-4" /></RouterLink>
        <button v-if="peutPiloter" :class="L.btnOutline" @click="propositionOuverte = true"><Wand2 class="w-4 h-4" /> Proposer un chargement (hors carburant)</button>
        <button v-if="peutPiloter" :class="L.btnOutline" @click="tourneeCarburantOuverte = true"><Fuel class="w-4 h-4" /> Nouvelle tournée de carburant</button>
        <button v-if="peutPiloter" :class="L.btnPrimary" @click="ouvrirCreation"><Plus class="w-4 h-4" /> Nouvel ordre</button>
      </div>
    </div>

    <!-- Expéditions en retard ou en alerte : compteurs qui filtrent le tableau -->
    <div class="flex items-center gap-2 flex-wrap mb-3 shrink-0">
      <button class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium border cursor-pointer"
              :class="filtreAlerte === 'retard' ? 'bg-danger text-white border-danger' : 'bg-card text-danger border-danger/30'" @click="basculerAlerte('retard')">
        <Clock class="w-3.5 h-3.5" /> En retard · {{ compteurs.retard }}
      </button>
      <button class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium border cursor-pointer"
              :class="filtreAlerte === 'alerte' ? 'bg-warning text-white border-warning' : 'bg-card text-warning border-warning/30'" @click="basculerAlerte('alerte')">
        <CalendarClock class="w-3.5 h-3.5" /> Date dépassée · {{ compteurs.alerte }}
      </button>
      <button v-for="c in COMPTEURS_SUITE" :key="c.cle" class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium border cursor-pointer" :data-compteur="c.cle"
              :class="filtreAlerte === c.cle ? 'bg-warning text-white border-warning' : 'bg-card text-warning border-warning/30'" @click="basculerAlerte(c.cle)">
        <AlertCircle class="w-3.5 h-3.5" /> {{ c.libelle }} · {{ compteurs[c.cle] }}
      </button>
    </div>

    <div v-if="filtresOuverts" class="flex items-end gap-3 flex-wrap bg-card border border-border rounded-lg px-3.5 py-3 mb-4 shrink-0">
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Du</label>
        <input v-model="filtres.du" type="date" :class="L.fpSelect" class="!w-[150px]" />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Au</label>
        <input v-model="filtres.au" type="date" :class="L.fpSelect" class="!w-[150px]" />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Dépôt</label>
        <select v-model="filtres.depot" :class="L.fpSelect" class="!w-[190px]">
          <option value="">Tous</option>
          <option v-for="d in depots" :key="d.id" :value="d.nom">{{ d.nom }}</option>
        </select>
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Région</label>
        <select v-model="filtres.region" :class="L.fpSelect" class="!w-[170px]">
          <option value="">Toutes</option>
          <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
        </select>
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Client</label>
        <select v-model="filtres.client" :class="L.fpSelect" class="!w-[210px]">
          <option value="">Tous</option>
          <option v-for="c in clients" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <button class="py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer hover:text-primary" @click="reinitialiserFiltres">Réinitialiser</button>
      <p v-if="erreurFiltre" class="text-[12px] text-danger w-full">{{ erreurFiltre }}</p>
    </div>

    <div v-if="message" class="flex items-center gap-2 rounded-lg px-3.5 py-2.5 mb-4 shrink-0" :class="message.erreur ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'">
      <component :is="message.erreur ? AlertCircle : CheckCircle2" class="w-4 h-4 shrink-0" />
      <p class="text-xs flex-1">{{ message.texte }}</p>
      <button class="bg-transparent border-0 cursor-pointer text-inherit" title="Fermer" @click="message = null"><X class="w-4 h-4" /></button>
    </div>

    <!-- Le tableau tient toute la hauteur restante ; chaque colonne défile pour
         son propre compte, de sorte que l'ensemble des colonnes reste visible
         sans jamais faire défiler la page. -->
    <div class="flex-1 min-h-0 flex gap-3.5 overflow-x-auto">
      <div v-for="col in colonnes" :key="col.statut" class="flex-1 shrink-0 min-w-[240px] max-w-[380px] rounded-lg flex flex-col min-h-0" :class="col.bgCls">
        <div class="flex items-center justify-between px-3.5 py-3 shrink-0">
          <span class="text-[13px] font-bold text-foreground">{{ col.libelle }}</span>
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" :class="col.badgeCls">{{ col.items.length }}</span>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 px-2.5 pb-3">
          <p v-if="!col.items.length" class="text-center text-[12px] text-muted-foreground italic py-4">Aucun ordre {{ col.libelleMinuscule }}</p>

          <div v-for="v in col.items" :key="v.id" :class="L.card" class="!p-3 cursor-pointer hover:shadow-md transition-shadow shrink-0" @click="ouvrirFiche(v.id)">
            <div class="flex items-start justify-between gap-2 mb-2">
              <span class="font-mono font-semibold text-primary text-[13px] truncate">{{ v.numeroOT || v.reference }}</span>
              <Truck class="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
            <div class="flex items-center gap-1.5 text-[12px] text-foreground mb-0.5">
              <UserRound class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span class="truncate">{{ v.moyen === 'externe' ? (v.transporteurNom ?? 'Transporteur externe') : (v.chauffeurNom ?? 'Aucun conducteur') }}</span>
            </div>
            <div class="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-2.5 relative"
                 @mouseenter="destinataires(v).length > 1 && (survolDestinataires = v.id)" @mouseleave="survolDestinataires = null">
              <Container class="w-3.5 h-3.5 shrink-0" />
              <span class="truncate" :class="destinataires(v).length > 1 ? 'underline decoration-dotted underline-offset-2 cursor-help' : ''">{{ (v.moyen === 'externe' ? v.vehiculeTransporteurPlaque : v.vehiculePlaque) ?? '-' }} · {{ v.clientNom }}</span>
              <div v-if="survolDestinataires === v.id" class="absolute left-0 top-full mt-1 z-20 bg-card border border-border rounded-md shadow-lg px-3 py-2 min-w-[200px]">
                <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mb-1">{{ destinataires(v).length }} destinataires</p>
                <p v-for="d in destinataires(v)" :key="d" class="text-[12px] text-foreground leading-snug">{{ d }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-2.5 border-t border-border">
              <div>
                <p class="text-[10px] text-muted-foreground uppercase tracking-[0.04em]">Livraisons à faire</p>
                <p class="text-[13px] font-bold text-foreground flex items-center gap-1"><Package class="w-3 h-3 text-muted-foreground" /> {{ dansTournee(v).length }}</p>
              </div>
              <div>
                <p class="text-[10px] text-muted-foreground uppercase tracking-[0.04em]">Livraisons déclarées</p>
                <p class="text-[13px] font-bold flex items-center gap-1" :class="dansTournee(v).length && dansTournee(v).every((e: EtapeVoyage) => e.franchi) ? 'text-success' : 'text-foreground'">
                  <CheckCircle2 class="w-3 h-3" /> {{ dansTournee(v).filter((e: EtapeVoyage) => e.franchi).length }}
                </p>
              </div>
            </div>

            <p v-if="v.creeParReplanification" class="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border leading-snug">{{ v.replanifieDepuis?.length ? `Replanifié depuis ${v.replanifieDepuis.join(', ')}` : 'Replanifié' }}</p>
            <p v-if="v.carburant" class="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border flex items-center gap-1"><Fuel class="w-3 h-3 shrink-0" /> Carburant · {{ v.carburant.depotNom }}</p>
            <p v-if="prochaine(v)" class="text-[11px] mt-2 pt-2 border-t border-border leading-snug" :class="prochaine(v)!.enRetard ? 'text-danger font-medium' : 'text-muted-foreground'">
              {{ prochaine(v)!.nom }} : arrivée estimée {{ heureLisible(prochaine(v)!.estimee) }}<template v-if="prochaine(v)!.retard"> · {{ fmtRetard(prochaine(v)!.retard) }}</template>
            </p>
            <p v-if="depassement(v).expiree" class="text-[11px] mt-2 pt-2 border-t border-border leading-snug" :class="depassement(v).bloque ? 'text-danger' : 'text-warning'">{{ depassement(v).motif }}</p>
            <p v-if="v.statut === 'annule' && v.motifAnnulation" class="text-[11px] text-danger mt-2 pt-2 border-t border-border leading-snug">Annulé : {{ v.motifAnnulation }}</p>

            <button v-if="v.statut === 'en_attente' && peutPiloter && !v.carburant" :class="cls.btnPrimary" class="w-full justify-center !py-1.5 !text-[12px] mt-2.5" :disabled="!v.etapes.length" :title="!v.etapes.length ? 'Ajoutez au moins une ligne de livraison avant de planifier cet ordre.' : undefined" @click.stop="planifierRapide(v.id)">
              <CalendarClock class="w-3.5 h-3.5" /> Planifier
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

    <NouvelleTourneeCarburantModal v-if="tourneeCarburantOuverte" @close="tourneeCarburantOuverte = false" @cree="tourneeCreee" />
    <PropositionChargementModal v-if="propositionOuverte" :controle="controleProposition" @close="propositionOuverte = false" @efface="propositionEffacee" @valide="propositionValidee" />
    <OrdreTransportCard v-if="ficheOuverte" :voyages="voyagesVisibles" :voyage-id="ficheId" @close="fermerFiche" @created="onCreated" @ouvrir="ouvrirFiche" />
</template>

<script setup lang="ts">
/**
 * Planification : tableau des ordres de transport, une colonne par statut
 * (les huit statuts de l'expédition). Toute la hauteur de l'écran est mise à
 * profit : pas de barre latérale pour ce module, et les colonnes tiennent
 * ensemble à l'écran, chacune défilant pour son propre compte.
 */
import { ref, computed } from 'vue'
import { Search, Filter, Plus, Wand2, Truck, UserRound, Container, Package, CheckCircle2, CalendarClock, Clock, Settings2, AlertCircle, X, Fuel } from '@lucide/vue'
import NouvelleTourneeCarburantModal from '../../components/planification/NouvelleTourneeCarburantModal.vue'
import OrdreTransportCard from '../../components/flotte/OrdreTransportCard.vue'
import ImportCommandesBouton from '../../components/planification/ImportCommandesBouton.vue'
import PropositionChargementModal, { type CommandeProposee, type VehiculePropose } from '../../components/planification/PropositionChargementModal.vue'
import { usePerimetresStore } from '../../stores/perimetres'
import { useControlesTransportStore } from '../../stores/controlesTransport'
import { useContraintesLivraisonStore } from '../../stores/contraintesLivraison'
import { heureEstimee, retardMinutes, estEnRetard, voyageEnRetard, fmtHeure, fmtJourHeure, fmtRetard } from '../../lib/horairesLivraison'
import { aujourdhuiDate } from '../../utils/horloge'
import { useCommandesStore } from '../../stores/commandes'
import { useAuthStore } from '../../stores/auth'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import { useSitesStore } from '../../stores/sites'
import { useVehiculeStore } from '../../stores/vehicules'
import { dansLaTournee } from '../../utils/voyageUtils'
import { useVoyagesStore } from '../../stores/voyages'
import type { EtapeVoyage, Voyage } from '../../types'
import * as L from '../../lib/listClasses'
import * as cls from '../../lib/formClasses'

const store = useVoyagesStore()
const auth = useAuthStore()
const paramsPlanif = useParametresPlanificationStore()
const sitesStore = useSitesStore()
const vehicules = useVehiculeStore()
const peutPiloter = computed(() => paramsPlanif.peutPiloter(auth.role))
const recherche = ref('')
const commandesStore = useCommandesStore()
const ficheOuverte = ref(false)
const ficheId = ref('')
const message = ref<{ texte: string; erreur: boolean } | null>(null)

/** Pilotée par un état réactif plutôt que par le survol CSS pur : les
 *  groupes nommés (group-hover) se sont révélés instables dans cette
 *  configuration Tailwind. */
const survolDestinataires = ref<string | null>(null)
/** Les lignes sorties de la tournée ou annulées ne comptent plus parmi les livraisons à faire. */
function dansTournee(v: { etapes: EtapeVoyage[] }) { return v.etapes.filter(dansLaTournee) }
function destinataires(v: { etapes: { destinataire?: string }[] }) {
  return [...new Set(v.etapes.map(e => e.destinataire).filter((d): d is string => !!d))]
}

/* ── Filtres du tableau : période, dépôt, région et client ── */
const filtresOuverts = ref(false)
const filtres = ref({ du: '', au: '', depot: '', region: '', client: '' })
const filtresActifs = computed(() => Object.values(filtres.value).some(Boolean))
const erreurFiltre = computed(() => filtres.value.du && filtres.value.au && filtres.value.au < filtres.value.du ? 'La fin de la période précède son début.' : '')
function reinitialiserFiltres() { filtres.value = { du: '', au: '', depot: '', region: '', client: '' } }
/** Dépôts : sites actifs du référentiel dont le type est un dépôt ou une base. */
const depots = computed(() => sitesStore.depots)
const regions = computed(() => [...new Set(sitesStore.actifs.map(s => s.region).filter((r): r is string => !!r))].sort())
const clients = computed(() => [...new Set(store.voyages.flatMap(v => v.etapes.map(e => e.destinataire)).filter((d): d is string => !!d))].sort())
/** Dépôt d'un ordre : site de départ de sa tournée, sinon base du véhicule. */
function depotDe(v: Voyage): string | undefined {
  if (v.carburant) return v.carburant.depotNom
  const depart = v.etapes.find(e => e.role === 'depart')
  if (depart) return depart.siteNom
  return v.vehiculeId ? vehicules.parId(v.vehiculeId)?.site : undefined
}
function regionsDe(v: Voyage): string[] {
  const noms = [depotDe(v), ...v.etapes.map(e => e.siteNom)]
  const ids = v.etapes.map(e => e.siteId)
  const out = sitesStore.sites.filter(s => s.region && (ids.includes(s.id) || noms.includes(s.nom))).map(s => s.region!)
  return v.carburant ? [...out, v.carburant.region] : out
}
function passeFiltres(v: Voyage) {
  const f = filtres.value
  const jour = v.datePlanifiee.slice(0, 10)
  if (!erreurFiltre.value) {
    if (f.du && jour < f.du) return false
    if (f.au && jour > f.au) return false
  }
  if (f.depot && depotDe(v) !== f.depot) return false
  if (f.region && !regionsDe(v).includes(f.region)) return false
  if (f.client && !v.etapes.some(e => e.destinataire === f.client)) return false
  return true
}

/* ── Périmètre : un utilisateur rattaché ne voit que ses dépôts et régions ── */
const perimetres = usePerimetresStore()
const controles = useControlesTransportStore()
const contraintes = useContraintesLivraisonStore()
/* Le dépôt de départ compte aussi : la base du véhicule, pour un ordre encore sans livraison. */
const visible = (v: Voyage) => perimetres.voitExpedition(auth.user?.id, v) || perimetres.voitLieu(auth.user?.id, { nom: depotDe(v) })
const voyagesVisibles = computed(() => store.voyages.filter(visible))

/* ── Expéditions en retard ou en alerte ── */
const depassement = (v: Voyage) => controles.etatDepassement(v)
type CleAlerte = 'retard' | 'alerte' | 'contestation' | 'ecart' | 'protet'
const filtreAlerte = ref<'' | CleAlerte>('')
function basculerAlerte(f: CleAlerte) { filtreAlerte.value = filtreAlerte.value === f ? '' : f }
/* Suite des livraisons : contestations à traiter (même après clôture), écarts à qualifier, notes de protêt ouvertes. */
const COMPTEURS_SUITE = [
  { cle: 'contestation', libelle: 'Contestations à traiter' },
  { cle: 'ecart', libelle: 'Écarts à qualifier' },
  { cle: 'protet', libelle: 'Notes de protêt ouvertes' },
] as const
const aSuivreSuite: Record<'contestation' | 'ecart' | 'protet', (v: Voyage) => number> = {
  contestation: v => store.contestationsATraiter(v).length,
  ecart: v => store.ecartsAQualifier(v).length,
  protet: v => store.notesProtetOuvertes(v).length,
}
const compteurs = computed(() => {
  const liste = store.voyages.filter(v => visible(v) && passeFiltres(v))
  return { retard: liste.filter(voyageEnRetard).length, alerte: liste.filter(v => depassement(v).expiree).length,
    contestation: liste.reduce((t, v) => t + aSuivreSuite.contestation(v), 0), ecart: liste.reduce((t, v) => t + aSuivreSuite.ecart(v), 0), protet: liste.reduce((t, v) => t + aSuivreSuite.protet(v), 0) }
})
/** L'heure seule pour aujourd'hui, le jour et l'heure sinon. */
function heureLisible(d: Date) { return d.toDateString() === aujourdhuiDate().toDateString() ? fmtHeure(d) : fmtJourHeure(d) }
/** Prochaine livraison encore à faire, avec son heure estimée et son retard. */
function prochaine(v: Voyage) {
  if (!['planifie', 'confirme', 'pret', 'en_cours'].includes(v.statut)) return null
  const e = [...v.etapes].sort((a, b) => a.ordre - b.ordre).find(x => x.role === 'livraison' && dansLaTournee(x) && !x.franchi && !x.arriveeLe && !x.reporteLe)
  if (!e) return null
  const estimee = heureEstimee(v, e)
  if (!estimee) return null
  const retard = retardMinutes(v, e)
  return { nom: e.destinataire ?? e.siteNom, estimee, retard: retard && retard > 0 ? retard : null, enRetard: estEnRetard(v, e) }
}

/** Contraintes de livraison, compatibilité des produits et date dépassée,
 *  appliquées à la proposition automatique comme aux corrections. */
function controleProposition(c: CommandeProposee, veh: VehiculePropose, chargees: CommandeProposee[]) {
  const date = controles.peutCharger(c.commande)
  if (!date.ok) return date
  const toutes = [c, ...chargees]
  return contraintes.respecteContraintes({
    vehiculeIds: [veh.id],
    produits: toutes.map(x => store.produitDeCommande(x.commande)).filter((p): p is string => !!p),
    livraisons: toutes.map(x => ({ client: x.commande.siteId ? undefined : x.commande.destinataire, siteId: x.commande.siteId })),
  })
}

function correspond(v: Voyage) {
  if (!visible(v)) return false
  if (!passeFiltres(v)) return false
  if (filtreAlerte.value === 'retard' && !voyageEnRetard(v)) return false
  if (filtreAlerte.value === 'alerte' && !depassement(v).expiree) return false
  if ((filtreAlerte.value === 'contestation' || filtreAlerte.value === 'ecart' || filtreAlerte.value === 'protet') && !aSuivreSuite[filtreAlerte.value](v)) return false
  if (!recherche.value.trim()) return true
  const q = recherche.value.toLowerCase()
  const destinataires = v.etapes.map(e => e.destinataire ?? '').join(' ')
  return `${v.reference} ${v.numeroOT ?? ''} ${v.clientNom} ${v.vehiculePlaque ?? ''} ${v.chauffeurNom ?? ''} ${destinataires}`.toLowerCase().includes(q)
}

const colonnes = computed(() => [
  { statut: 'en_attente', libelle: 'En attente', libelleMinuscule: 'en attente', badgeCls: 'bg-warning', bgCls: 'bg-warning-bg/40', items: store.enAttente.filter(correspond) },
  { statut: 'planifie', libelle: 'Planifié', libelleMinuscule: 'planifié', badgeCls: 'bg-info', bgCls: 'bg-info-bg/40', items: store.planifies.filter(correspond) },
  { statut: 'confirme', libelle: 'Confirmé', libelleMinuscule: 'confirmé', badgeCls: 'bg-info', bgCls: 'bg-info-bg/40', items: store.confirmes.filter(correspond) },
  { statut: 'pret', libelle: 'Prêt pour exécution', libelleMinuscule: 'prêt', badgeCls: 'bg-info', bgCls: 'bg-info-bg/40', items: store.prets.filter(correspond) },
  { statut: 'en_cours', libelle: 'En cours', libelleMinuscule: 'en cours', badgeCls: 'bg-primary', bgCls: 'bg-primary/[0.06]', items: store.enCoursKanban.filter(correspond) },
  { statut: 'livre', libelle: 'Terminé, en attente de clôture', libelleMinuscule: 'en attente de clôture', badgeCls: 'bg-success', bgCls: 'bg-success-bg/40', items: store.enAttenteCloture.filter(correspond) },
  { statut: 'cloture', libelle: 'Clôturé', libelleMinuscule: 'clôturé', badgeCls: 'bg-neutral', bgCls: 'bg-neutral-bg/60', items: store.clotures.filter(correspond) },
  { statut: 'annule', libelle: 'Annulé', libelleMinuscule: 'annulé', badgeCls: 'bg-danger', bgCls: 'bg-danger-bg/40', items: store.annules.filter(correspond) },
])

function ouvrirCreation() { ficheId.value = ''; ficheOuverte.value = true }
function ouvrirFiche(id: string) { ficheId.value = id; ficheOuverte.value = true }
function fermerFiche() { ficheOuverte.value = false }
function onCreated(id: string) { ficheId.value = id }
/* ── Tournée de carburant : créée en attente, puis ouverte en fiche ── */
const tourneeCarburantOuverte = ref(false)
function tourneeCreee(id: string) {
  tourneeCarburantOuverte.value = false
  const v = store.getById(id)
  message.value = { texte: `Tournée de carburant ${v?.carburant?.reference ?? ''} créée en attente : ${v?.reference ?? ''}.`, erreur: false }
  ouvrirFiche(id)
}
/* ── Proposition automatique de chargement ── */
const propositionOuverte = ref(false)
function propositionEffacee() {
  propositionOuverte.value = false
  message.value = { texte: 'Proposition effacée : les commandes restent en attente, à affecter à la main.', erreur: false }
}
function propositionValidee(ids: string[], refus: string[]) {
  propositionOuverte.value = false
  const refs = ids.map(id => store.getById(id)?.numeroOT || store.getById(id)?.reference).join(', ')
  message.value = { texte: `${ids.length} ordre(s) de transport créé(s) en attente : ${refs}.${refus.length ? ` Non créés : ${refus.join(' ')}` : ''}`, erreur: refus.length > 0 }
}
function planifierRapide(id: string) {
  const v = store.getById(id)
  const res = store.planifier(id)
  message.value = res.ok
    ? { texte: `Ordre ${v?.numeroOT || v?.reference || ''} planifié.`, erreur: false }
    : { texte: `${v?.numeroOT || v?.reference || 'Ordre'} : ${res.motif ?? 'planification impossible.'}`, erreur: true }
}
</script>
