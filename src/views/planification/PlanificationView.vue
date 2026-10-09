<template>
  <div class="h-full flex flex-col px-7 py-6 max-[640px]:px-4">
    <div class="flex items-start justify-between gap-3 mb-4 flex-wrap shrink-0">
      <div>
        <div :class="L.pageTitle">Planification</div>
        <div :class="L.pageSub">{{ store.voyages.length }} ordre(s) de transport<template v-if="commandesStore.enAttente.length"> · {{ commandesStore.enAttente.length }} commande(s) reçue(s) en attente d'un ordre, à rattacher depuis « Nouvel ordre »</template></div>
      </div>
      <div class="flex items-center gap-2">
        <div :class="L.searchBox" class="!h-[34px]">
          <Search class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input v-model="recherche" type="text" placeholder="Rechercher un ordre, un destinataire, un véhicule…"
                 class="border-0 outline-none bg-transparent text-[13px] w-[260px]" />
        </div>
        <button :class="L.tbIconBtn" title="Filtrer"><Filter class="w-4 h-4" /></button>
        <button :class="L.tbIconBtn" title="À propos de ce tableau" @click="aPropos = !aPropos"><Info class="w-4 h-4" /></button>
        <button :class="L.btnPrimary" @click="ouvrirCreation"><Plus class="w-4 h-4" /> Nouvel ordre</button>
      </div>
    </div>

    <div v-if="aPropos" class="flex items-start gap-2.5 bg-info-bg text-info rounded-lg px-3.5 py-2.5 mb-4 shrink-0">
      <Info class="w-4 h-4 shrink-0 mt-px" />
      <div class="flex-1">
        <p class="text-xs leading-relaxed">
          Un ordre créé apparaît en attente, avec ses lignes de livraison à définir - chacune son propre
          destinataire, jamais un client unique pour tout l'ordre. « Plan » affecte l'ordre au chauffeur : il
          passe en planifié, et le chauffeur en est notifié, sans étape de validation à faire de son côté.
          L'ordre passe de lui-même en cours dès que le chauffeur signe sa première livraison : commencer à
          livrer, c'est ce qui démarre la tournée. Chaque livraison signée rapproche ensuite l'ordre de sa
          clôture automatique, une fois toutes les lignes signées. Annuler reste réservé au planificateur,
          jamais une action du chauffeur.
        </p>
        <p class="text-xs leading-relaxed mt-2">
          Les données créées ici restent dans le navigateur, partagées entre tous les onglets ouverts sur
          cette même adresse - y compris les liens de suivi envoyés aux destinataires - et survivent à un
          rechargement de la page.
          <button class="underline font-medium bg-transparent border-0 cursor-pointer p-0 text-inherit" @click="reinitialiser">Revenir aux données de démonstration d'origine</button>
        </p>
      </div>
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
              <UserRound class="w-3.5 h-3.5 text-muted-foreground shrink-0" /> <span class="truncate">{{ v.chauffeurNom ?? 'Aucun chauffeur' }}</span>
            </div>
            <div class="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-2.5 relative"
                 @mouseenter="destinataires(v).length > 1 && (survolDestinataires = v.id)" @mouseleave="survolDestinataires = null">
              <Container class="w-3.5 h-3.5 shrink-0" />
              <span class="truncate" :class="destinataires(v).length > 1 ? 'underline decoration-dotted underline-offset-2 cursor-help' : ''">{{ v.vehiculePlaque ?? '-' }} · {{ v.clientNom }}</span>
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
                <p class="text-[10px] text-muted-foreground uppercase tracking-[0.04em]">Livraisons signées</p>
                <p class="text-[13px] font-bold flex items-center gap-1" :class="dansTournee(v).length && dansTournee(v).every((e: EtapeVoyage) => e.franchi) ? 'text-success' : 'text-foreground'">
                  <CheckCircle2 class="w-3 h-3" /> {{ dansTournee(v).filter((e: EtapeVoyage) => e.franchi).length }}
                </p>
              </div>
            </div>

            <p v-if="v.statut === 'annule' && v.motifAnnulation" class="text-[11px] text-danger mt-2 pt-2 border-t border-border leading-snug">Annulé : {{ v.motifAnnulation }}</p>

            <button v-if="v.statut === 'en_attente'" :class="cls.btnPrimary" class="w-full justify-center !py-1.5 !text-[12px] mt-2.5" :disabled="!v.etapes.length" @click.stop="planifierRapide(v.id)">
              <CalendarClock class="w-3.5 h-3.5" /> Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

    <OrdreTransportCard v-if="ficheOuverte" :voyages="store.voyages" :voyage-id="ficheId" @close="fermerFiche" @created="onCreated" @ouvrir="ouvrirFiche" />
</template>

<script setup lang="ts">
/**
 * Planification - tableau kanban des ordres de transport, adapté au
 * module de planification des livraisons étudié comme référence pour
 * le futur TMS. Cinq statuts : en attente, planifié, en cours, terminé,
 * annulé - le planificateur affecte l'ordre à un chauffeur pour le
 * planifier, et c'est le chauffeur qui fait passer l'ordre en cours en
 * signant sa première livraison, sans étape de validation distincte.
 *
 * Le contenu des cartes reprend la logique d'UCODIS - des lignes de
 * livraison, chacune son propre destinataire, plutôt qu'un client
 * unique pour tout l'ordre - inspirée de la notion de lignes de
 * commande et de colis de la référence, propre à un entrepôt de
 * dispatching, adaptée au transport de fret.
 *
 * Toute la hauteur de l'écran est mise à profit : pas de barre latérale
 * pour ce module (voir DashboardLayout), et les colonnes tiennent
 * ensemble à l'écran, chacune défilant pour son propre compte plutôt
 * que de faire défiler la page entière.
 */
import { ref, computed } from 'vue'
import { Search, Filter, Info, Plus, Truck, UserRound, Container, Package, CheckCircle2, CalendarClock } from '@lucide/vue'
import OrdreTransportCard from '../../components/flotte/OrdreTransportCard.vue'
import { useCommandesStore } from '../../stores/commandes'
import { horsTournee } from '../../utils/voyageUtils'
import { useVoyagesStore } from '../../stores/voyages'
import type { EtapeVoyage } from '../../types'
import * as L from '../../lib/listClasses'
import * as cls from '../../lib/formClasses'

const store = useVoyagesStore()
const recherche = ref('')
const aPropos = ref(false)
function reinitialiser() {
  if (confirm("Revenir aux données de démonstration d'origine ? Tout ce qui a été créé ou modifié pendant la démonstration sera perdu, dans tous les onglets ouverts.")) {
    store.reinitialiser()
  }
}
const commandesStore = useCommandesStore()
const ficheOuverte = ref(false)
const ficheId = ref('')

/** Un ordre n'est jamais figé à un seul client : la liste complète des
 *  destinataires reste consultable au survol de la carte, plutôt que
 *  de se figer sur le premier nom affiché. */
/** Pilotée par un état réactif plutôt que par le survol CSS pur : les
 *  groupes nommés (group-hover) se sont révélés instables dans cette
 *  configuration Tailwind. */
const survolDestinataires = ref<string | null>(null)
/** Les lignes sorties de la tournée (destinataire indisponible avant chargement,
 *  ou commande annulée) ne comptent plus parmi les livraisons à faire. */
function dansTournee(v: { etapes: EtapeVoyage[] }) { return v.etapes.filter(e => !horsTournee(e) && !e.ligneAnnuleeLe) }
function destinataires(v: { etapes: { destinataire?: string }[] }) {
  return [...new Set(v.etapes.map(e => e.destinataire).filter((d): d is string => !!d))]
}

function correspond(v: { reference: string; numeroOT?: string; clientNom: string; vehiculePlaque?: string; chauffeurNom?: string; etapes: { destinataire?: string }[] }) {
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
  { statut: 'livre', libelle: 'En attente de clôture', libelleMinuscule: 'en attente de clôture', badgeCls: 'bg-success', bgCls: 'bg-success-bg/40', items: store.enAttenteCloture.filter(correspond) },
  { statut: 'cloture', libelle: 'Clôturé', libelleMinuscule: 'clôturé', badgeCls: 'bg-neutral', bgCls: 'bg-neutral-bg/60', items: store.clotures.filter(correspond) },
  { statut: 'annule', libelle: 'Annulé', libelleMinuscule: 'annulé', badgeCls: 'bg-danger', bgCls: 'bg-danger-bg/40', items: store.annules.filter(correspond) },
])

function ouvrirCreation() { ficheId.value = ''; ficheOuverte.value = true }
function ouvrirFiche(id: string) { ficheId.value = id; ficheOuverte.value = true }
function fermerFiche() { ficheOuverte.value = false }
function onCreated(id: string) { ficheId.value = id }
function planifierRapide(id: string) {
  const res = store.planifier(id)
  if (!res.ok) alert(res.motif)
}
</script>
