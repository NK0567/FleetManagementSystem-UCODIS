<template>
  <div :class="L.pageWrap">
    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Rapports</div>
        <div :class="L.pageSub">Indicateurs calculés à partir des autres écrans · {{ libellePeriode(periode) }}{{ perimetreLisible ? ` · ${perimetreLisible}` : '' }}</div>
      </div>
      <BoutonsExport :rapport="rapport" />
    </div>

    <div class="flex gap-1 border-b border-border mb-3.5 overflow-x-auto">
      <button v-for="t in ONGLETS" :key="t.key" type="button" @click="onglet = t.key"
        class="px-3.5 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer bg-transparent"
        :class="onglet === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'">{{ t.label }}</button>
    </div>

    <!-- Filtres communs : période et site -->
    <div :class="L.card" class="mb-3.5">
      <div class="flex flex-wrap items-end gap-3">
        <div :class="F.field"><label :class="F.fieldLabel">Du</label><input v-model="periode.du" type="date" :max="periode.au" :class="F.fieldInput" class="!w-[160px]" /></div>
        <div :class="F.field"><label :class="F.fieldLabel">Au</label><input v-model="periode.au" type="date" :min="periode.du" :class="F.fieldInput" class="!w-[160px]" /></div>
        <div v-if="!transport" :class="F.field"><label :class="F.fieldLabel">Site</label>
          <select v-model="site" :class="F.fieldSelect" class="!w-[200px]"><option value="">Tous les sites</option><option v-for="s in sites" :key="s" :value="s">{{ s }}</option></select>
        </div>
        <template v-else>
          <div :class="F.field"><label :class="F.fieldLabel">Dépôt</label>
            <select v-model="filtresTr.depot" :class="F.fieldSelect" class="!w-[190px]"><option value="">Tous les dépôts</option><option v-for="d in rt.depots" :key="d.id" :value="d.nom">{{ d.nom }}</option></select>
          </div>
          <div :class="F.field"><label :class="F.fieldLabel">Région</label>
            <select v-model="filtresTr.region" :class="F.fieldSelect" class="!w-[170px]"><option value="">Toutes les régions</option><option v-for="r in rt.regions" :key="r" :value="r">{{ r }}</option></select>
          </div>
          <div :class="F.field"><label :class="F.fieldLabel">Client</label>
            <select v-model="filtresTr.client" :class="F.fieldSelect" class="!w-[210px]"><option value="">Tous les clients</option><option v-for="c in rt.clients" :key="c" :value="c">{{ c }}</option></select>
          </div>
        </template>
        <template v-if="onglet === 'synthese'">
          <div :class="F.field"><label :class="F.fieldLabel">Comparer avec</label>
            <select v-model="comparaison" :class="F.fieldSelect" class="!w-[210px]">
              <option value="">Aucune comparaison</option><option value="precedente">La période précédente</option>
              <option value="periode">Une autre période</option><option value="site">Un autre site</option>
            </select>
          </div>
          <template v-if="comparaison === 'periode'">
            <div :class="F.field"><label :class="F.fieldLabel">Période B du</label><input v-model="periodeB.du" type="date" :max="periodeB.au" :class="F.fieldInput" class="!w-[160px]" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">au</label><input v-model="periodeB.au" type="date" :min="periodeB.du" :class="F.fieldInput" class="!w-[160px]" /></div>
          </template>
          <div v-if="comparaison === 'site'" :class="F.field"><label :class="F.fieldLabel">Site B</label>
            <select v-model="siteB" :class="F.fieldSelect" class="!w-[200px]"><option value="">Tous les sites</option><option v-for="s in sites" :key="s" :value="s">{{ s }}</option></select>
          </div>
        </template>
        <div v-if="onglet === 'conducteurs' || onglet === 'tr_ponctualite'" :class="F.field"><label :class="F.fieldLabel">{{ onglet === 'conducteurs' ? 'Performance par' : 'Ponctualité par' }}</label>
          <select v-model="granularite" :class="F.fieldSelect" class="!w-[140px]"><option value="jour">Jour</option><option value="semaine">Semaine</option></select>
        </div>
      </div>
      <p v-if="erreurFiltres" class="text-[12px] text-danger mt-2">{{ erreurFiltres }}</p>
      <p v-else-if="onglet === 'synthese' && comparaison === 'site' && site === siteB" class="text-[12px] text-warning mt-2">Les deux sites comparés sont identiques.</p>
    </div>

    <div v-if="!erreurFiltres" class="flex flex-col gap-3.5">
      <div v-for="s in sections" :key="s.titre" :class="L.card">
        <div :class="L.cardTitle">{{ s.titre }}</div>
        <div v-if="!s.lignes.length" class="text-xs text-muted-foreground py-2">Aucune donnée sur ce périmètre.</div>
        <div v-else class="overflow-x-auto">
          <table :class="L.table">
            <thead><tr><th v-for="c in s.colonnes" :key="c" :class="L.th">{{ c }}</th></tr></thead>
            <tbody>
              <tr v-for="(l, i) in s.lignes" :key="i">
                <td v-for="(v, j) in l" :key="j" :class="[L.td, j === 0 ? 'font-medium' : '', classeCellule(s.titre, i, j)]" class="text-xs">{{ affiche(v) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="s.note" class="text-[11px] text-muted-foreground mt-2">{{ s.note }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { maintenant } from '../../utils/horloge'
/**
 * Rapports de la flotte (FMS-RA-04, RA-05, RA-06). Chaque onglet construit
 * ses sections une seule fois : ce qui s'affiche est exactement ce qui
 * s'exporte en PDF ou en Excel. Les chiffres viennent des autres écrans,
 * jamais d'une ressaisie.
 */
import { ref, computed, watch } from 'vue'
import BoutonsExport from '../../components/shared/BoutonsExport.vue'
import { useReportingStore, periodeParDefaut, periodePrecedente, libellePeriode, dansPeriode, type Periode } from '../../stores/reporting'
import { useIndicateursStore, type CleIndicateur } from '../../stores/indicateurs'
import { useFormationsStore } from '../../stores/formations'
import { useConfigurationStore } from '../../stores/configuration'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useCarburantStore } from '../../stores/carburant'
import { useVoyagesStore } from '../../stores/voyages'
import { useEcartsStore, LIB_NATURE, LIB_TYPE_ECART } from '../../stores/ecarts'
import { useInfractionsStore } from '../../stores/infractions'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import { useDocumentsVehiculeStore } from '../../stores/documentsVehicule'
import { useInspectionsStore } from '../../stores/inspections'
import { useDepartsStore } from '../../stores/departs'
import { useAlertesStore, LIB_CATEGORIE_ALERTE } from '../../stores/alertes'
import { useScoresConducteursStore } from '../../stores/scoresConducteurs'
import { useDisponibilitesStore } from '../../stores/disponibilites'
import { useReportingTransportStore, NOS_MOYENS, estRefusee, estReportee, estPartielle, qualiteDe, cleTemps as cleTempsTr, grouper, moyenne, somme, type FiltresTransport, type LignePonctualite } from '../../stores/reportingTransport'
import { voyageEnRetard, fmtJourHeure, fmtRetard } from '../../lib/horairesLivraison'
import { STATUTS_VOYAGE } from '../../utils/voyageUtils'
import { useControlesTransportStore } from '../../stores/controlesTransport'
import type { Voyage } from '../../types'
import type { Rapport, SectionRapport, ValeurRapport } from '../../lib/rapports'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const reporting = useReportingStore()
const ind = useIndicateursStore()
const config = useConfigurationStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()

type Onglet = 'synthese' | 'carburant' | 'conducteurs' | 'audit' | 'tr_activite' | 'tr_ponctualite' | 'tr_qualite' | 'tr_moyens'
const ONGLETS: { key: Onglet; label: string }[] = [
  { key: 'synthese', label: 'Synthèse de la direction' },
  { key: 'carburant', label: 'Carburant et pneumatiques' },
  { key: 'conducteurs', label: 'Conducteurs' },
  { key: 'audit', label: 'Audit de conformité' },
  { key: 'tr_activite', label: 'Transport : activité' },
  { key: 'tr_ponctualite', label: 'Ponctualité et coûts' },
  { key: 'tr_qualite', label: 'Qualité de livraison' },
  { key: 'tr_moyens', label: 'Moyens et transporteurs' },
]
const onglet = ref<Onglet>('synthese')
const periode = ref<Periode>(periodeParDefaut())
const site = ref('')
const comparaison = ref<'' | 'precedente' | 'periode' | 'site'>('')
const periodeB = ref<Periode>(periodePrecedente(periodeParDefaut()))
const siteB = ref('')
const granularite = ref<'jour' | 'semaine'>('semaine')
const sites = computed(() => reporting.sitesDuParc())
/* Onglets du transport : filtres de dépôt, de région et de client, comme le tableau de la planification. */
const rt = useReportingTransportStore()
const transport = computed(() => onglet.value.startsWith('tr_'))
const filtresTr = ref({ depot: '', region: '', client: '' })
const ft = (): FiltresTransport => ({ periode: periode.value, ...filtresTr.value })
const perimetreLisible = computed(() => transport.value
  ? [filtresTr.value.depot, filtresTr.value.region, filtresTr.value.client].filter(Boolean).join(' · ')
  : site.value)
watch(comparaison, c => { if (c === 'periode') periodeB.value = periodePrecedente(periode.value) })

const erreurFiltres = computed(() => {
  const ok = (p: Periode) => p.du && p.au && p.du <= p.au
  if (!ok(periode.value)) return 'La période est incomplète ou sa fin précède son début.'
  if (onglet.value === 'synthese' && comparaison.value === 'periode' && !ok(periodeB.value)) return 'La période de comparaison est incomplète ou sa fin précède son début.'
  return ''
})

const dev = () => config.devise()
const n = (v: number | null | undefined, d = 0) => v == null ? null : Number(v.toFixed(d))
const montant = (v: number) => `${Math.round(v).toLocaleString('fr-FR')} ${dev()}`.trim()
const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('fr-FR') : ''
function affiche(v: ValeurRapport) { return v == null || v === '' ? '-' : typeof v === 'number' ? v.toLocaleString('fr-FR') : v }
/** Écart de la synthèse coloré selon le sens de l'indicateur. */
let sensLignes: ('haut' | 'bas' | '')[] = []
/** Indicateurs du transport : la colonne Valeur se colore face à la cible réglée. */
const clesTr = new Map<string, { col: number; cles: (CleIndicateur | undefined)[] }>()
function classeCellule(titre: string, i: number, j: number) {
  const tr = clesTr.get(titre)
  if (tr) {
    const cle = tr.cles[i]; const v = sections.value.find(s => s.titre === titre)?.lignes[i]?.[j]
    return j === tr.col && cle && typeof v === 'number' ? `!${ind.couleur(cle, v)} font-semibold` : ''
  }
  if (titre !== SECTION_SYNTHESE || j !== 3) return ''
  const v = sections.value[0]?.lignes[i]?.[3]; const sens = sensLignes[i]
  if (typeof v !== 'number' || !v || !sens) return ''
  return (v > 0) === (sens === 'haut') ? '!text-success font-semibold' : '!text-danger font-semibold'
}

/* ── Synthèse de la direction (FMS-RA-06) ───────────────────────── */
const SECTION_SYNTHESE = 'Indicateurs de synthèse'
const vehiculesDe = (s: string) => new Set(reporting.vehiculesDuSite(s).map(v => v.id))
/** Libellé d'un indicateur suivi de son code, puis de son unité. */
const libInd = (k: CleIndicateur, unite?: string) => `${ind.libelle(k)} (${ind.code(k)})${unite ? `, ${unite}` : ''}`
function sectionsSynthese(): SectionRapport[] {
  const a = reporting.synthese({ periode: periode.value, site: site.value })
  const b = comparaison.value === 'precedente' ? reporting.synthese({ periode: periodePrecedente(periode.value), site: site.value })
    : comparaison.value === 'periode' ? reporting.synthese({ periode: periodeB.value, site: site.value })
    : comparaison.value === 'site' ? reporting.synthese({ periode: periode.value, site: siteB.value }) : null
  const lignes: { lib: string; cle?: CleIndicateur; a: number | null; b?: number | null; sens: 'haut' | 'bas' | '' }[] = [
    { lib: 'Véhicules au parc', a: a.vehicules, b: b?.vehicules, sens: '' },
    { lib: libInd('disponibilite', '%'), cle: 'disponibilite', a: a.tauxDisponibilite, b: b?.tauxDisponibilite, sens: 'haut' },
    { lib: "Jours d'immobilisation", a: a.joursImmobilisation, b: b?.joursImmobilisation, sens: 'bas' },
    { lib: 'Voyages réalisés', a: a.voyages, b: b?.voyages, sens: 'haut' },
    { lib: 'Kilomètres parcourus', a: a.km, b: b?.km, sens: '' },
    { lib: 'Carburant délivré (L)', a: n(a.litres), b: n(b?.litres), sens: '' },
    { lib: `Dépense de carburant (${dev()})`, a: n(a.depenseCarburant), b: n(b?.depenseCarburant), sens: 'bas' },
    { lib: libInd('consommation', 'L/100 km'), cle: 'consommation', a: a.consommation, b: b?.consommation, sens: 'bas' },
    { lib: 'Interventions de maintenance', a: a.interventions, b: b?.interventions, sens: '' },
    { lib: libInd('preventif', '%'), cle: 'preventif', a: a.partPreventive, b: b?.partPreventive, sens: 'haut' },
    { lib: `Coût de maintenance (${dev()})`, a: n(a.coutMaintenance), b: n(b?.coutMaintenance), sens: 'bas' },
    { lib: 'Écarts de trajet non justifiés', a: a.ecartsNonJustifies, b: b?.ecartsNonJustifies, sens: 'bas' },
    { lib: 'Infractions', a: a.infractions, b: b?.infractions, sens: 'bas' },
    { lib: libInd('ageMoyen', 'ans'), cle: 'ageMoyen', a: a.ageMoyen, b: b?.ageMoyen, sens: '' },
  ]
  sensLignes = lignes.map(l => l.sens)
  const libA = comparaison.value === 'site' ? (site.value || 'Tous les sites') : 'Période étudiée'
  const libB = comparaison.value === 'site' ? (siteB.value || 'Tous les sites') : comparaison.value ? `Période comparée (${libellePeriode(comparaison.value === 'precedente' ? periodePrecedente(periode.value) : periodeB.value)})` : ''
  /* La cible se lit par la clé de l'indicateur, jamais par son libellé. */
  const cibles = (cle?: CleIndicateur) => cle ? ind.texteCible(cle) : ''
  return [{
    titre: SECTION_SYNTHESE,
    colonnes: b ? ['Indicateur', libA, libB, 'Écart', 'Cible'] : ['Indicateur', libA, 'Cible'],
    lignes: lignes.map(l => b ? [l.lib, l.a, l.b ?? null, l.a != null && l.b != null ? n(l.a - l.b, 1) : null, cibles(l.cle)] : [l.lib, l.a, cibles(l.cle)]),
    note: 'Taux de disponibilité et jours d\'immobilisation mesurés sur les immobilisations qui recoupent la période ; consommation calculée de plein complet à plein complet ; kilomètres issus des voyages de la période.',
  }]
}

/* ── Carburant et pneumatiques (FMS-RA-04) ──────────────────────── */
function sectionsCarburant(): SectionRapport[] {
  const c = useCarburantStore()
  const ids = vehiculesDe(site.value)
  const pleins = c.recharges.filter(r => ids.has(r.vehiculeId) && dansPeriode(r.date, periode.value))
  const conso = c.periodesConso.filter(p => ids.has(p.vehiculeId) && dansPeriode(p.au, periode.value))
  const grouper = <K extends string>(cle: (r: typeof pleins[number]) => K) => {
    const m = new Map<K, { pleins: number; litres: number; montant: number; anomalies: number }>()
    pleins.forEach(r => { const k = cle(r); const e = m.get(k) ?? { pleins: 0, litres: 0, montant: 0, anomalies: 0 }; e.pleins++; e.litres += r.litres; e.montant += r.montant; if (r.statut === 'anomalie' || (r.controles ?? []).some(x => !x.ok)) e.anomalies++; m.set(k, e) })
    return [...m.entries()].sort((x, y) => y[1].montant - x[1].montant)
  }
  const consoDe = (plaque: string) => { const l = conso.filter(p => p.vehiculePlaque === plaque); return l.length ? n(l.reduce((s, p) => s + p.litresPour100km, 0) / l.length, 1) : null }
  const comparaisonPneus = (cle: 'marque' | 'fournisseur', titre: string): SectionRapport => ({
    titre, colonnes: [cle === 'marque' ? 'Marque' : 'Fournisseur', 'Pneus', `Coût total (${dev()})`, 'Kilomètres parcourus', `Coût au km (${dev()})`, 'Durée de vie moyenne (km)'],
    lignes: reporting.comparaisonPneus(cle).map(e => [e.nom, e.nb, n(e.cout), e.km, e.coutKm, e.dureeVieKm]),
    note: 'Tout le parc de pneus, quels que soient le site et la période ; durée de vie mesurée sur les pneus mis au rebut.',
  })
  return [
    { titre: 'Dépenses de carburant par véhicule', colonnes: ['Véhicule', 'Pleins', 'Litres', `Montant (${dev()})`, libInd('consommation', 'L/100 km'), 'Pleins à qualifier'],
      lignes: grouper(r => r.vehiculePlaque).map(([k, e]) => [k, e.pleins, n(e.litres), n(e.montant), consoDe(k), e.anomalies]) },
    { titre: 'Dépenses de carburant par chauffeur', colonnes: ['Conducteur', 'Pleins', 'Litres', `Montant (${dev()})`, 'Pleins à qualifier'],
      lignes: grouper(r => r.chauffeurNom || 'Non renseigné').map(([k, e]) => [k, e.pleins, n(e.litres), n(e.montant), e.anomalies]) },
    { titre: 'Dépenses de carburant par mois', colonnes: ['Mois', 'Pleins', 'Litres', `Montant (${dev()})`],
      lignes: grouper(r => r.date.slice(0, 7)).sort((x, y) => x[0].localeCompare(y[0])).map(([k, e]) => [new Date(k + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), e.pleins, n(e.litres), n(e.montant)]) },
    { titre: 'Écarts de consommation de la période', colonnes: ['Véhicule', 'Du', 'Au', 'L/100 km', 'Référence', 'Écart (%)'],
      lignes: conso.filter(p => Math.abs(p.ecartPct) > 0).sort((x, y) => y.ecartPct - x.ecartPct).map(p => [p.vehiculePlaque, fmtDate(p.du), fmtDate(p.au), n(p.litresPour100km, 1), p.refConso, n(p.ecartPct, 1)]) },
    comparaisonPneus('marque', 'Pneumatiques par marque'),
    comparaisonPneus('fournisseur', 'Pneumatiques par fournisseur'),
  ]
}

/* ── Conducteurs (FMS-RA-05) ────────────────────────────────────── */
function cleTemps(iso: string) {
  const d = new Date(iso.slice(0, 10))
  if (granularite.value === 'jour') return { cle: iso.slice(0, 10), lib: d.toLocaleDateString('fr-FR') }
  const lundi = new Date(+d - ((d.getDay() + 6) % 7) * 86_400_000)
  return { cle: lundi.toISOString().slice(0, 10), lib: `semaine du ${lundi.toLocaleDateString('fr-FR')}` }
}
function sectionsConducteurs(): SectionRapport[] {
  const ids = vehiculesDe(site.value)
  const voyages = useVoyagesStore().voyages.filter(v => v.vehiculeId && ids.has(v.vehiculeId) && dansPeriode(v.dateDepartReel, periode.value))
  /* Conducteurs du site : affectés à un véhicule de ce site pendant la période, ou qui y ont conduit un voyage. */
  const p = periode.value
  const conducteurs = [...personnel.conducteurs, ...personnel.aides].filter(c => !site.value
    || vehicules.affectations.some(a => a.conducteurId === c.id && ids.has(a.vehiculeId) && a.dateDebut.slice(0, 10) <= p.au && (!a.dateFin || a.dateFin.slice(0, 10) >= p.du))
    || voyages.some(v => v.chauffeurId === c.id))
  const idsConducteurs = new Set(conducteurs.map(c => c.id))
  const ecarts = useEcartsStore(); const infractions = useInfractionsStore().infractions
  const scores = useScoresConducteursStore(); const dispos = useDisponibilitesStore()
  const perf = new Map<string, { id: string; nom: string; lib: string; cle: string; voyages: number; km: number; heures: number; ecarts: number; infractions: number }>()
  const ligne = (id: string, iso: string) => {
    const t = cleTemps(iso); const k = `${id}|${t.cle}`
    const e = perf.get(k) ?? { id, nom: personnel.parId(id)?.nomComplet ?? id, lib: t.lib, cle: t.cle, voyages: 0, km: 0, heures: 0, ecarts: 0, infractions: 0 }
    perf.set(k, e); return e
  }
  voyages.forEach(v => {
    if (!v.chauffeurId || !idsConducteurs.has(v.chauffeurId)) return
    const e = ligne(v.chauffeurId, v.dateDepartReel!)
    e.voyages++; e.km += v.kmArrivee != null && v.kmDepart != null ? Math.max(0, v.kmArrivee - v.kmDepart) : v.kmReference ?? 0
    if (v.dateArriveeReelle) e.heures += Math.max(0, (+new Date(v.dateArriveeReelle) - +new Date(v.dateDepartReel!)) / 3_600_000)
  })
  conducteurs.forEach(c => {
    ecarts.ecartsDuChauffeur(c.id).filter(x => x.nature === 'non_justifiee' && dansPeriode(x.detecteLe, periode.value)).forEach(x => { ligne(c.id, x.detecteLe).ecarts++ })
    infractions.filter(i => i.conducteurId === c.id && dansPeriode(i.date, periode.value)).forEach(i => { ligne(c.id, i.date).infractions++ })
  })
  const docs = useDocumentsStore()
  /* Échéances qui tombent au plus tard à la fin de la période, pour les conducteurs retenus. */
  const echeances = docs.actifs.filter(d => idsConducteurs.has(d.personnelId) && ['proche', 'expire', 'absent'].includes(docs.etat(d))
    && (!d.dateExpiration || d.dateExpiration.slice(0, 10) <= p.au))
  /* Alertes ouvertes pendant la période, rattachées à un conducteur retenu ou à un véhicule du site. */
  const formations = useFormationsStore().formations
  const personneDeLAlerte = (a: { cle: string; query?: Record<string, string> }) => {
    if (a.cle.startsWith('doc-p-')) { const docId = a.query?.document?.replace(/^per:/, ''); return docs.actifs.find(d => d.id === docId)?.personnelId }
    if (a.query?.formation) return formations.find(f => f.id === a.query!.formation)?.conducteurId
    return undefined
  }
  const alertes = useAlertesStore().enCours.filter(a => ['infraction', 'formation', 'conduite', 'depart'].includes(a.categorie) || a.cle.startsWith('doc-p-'))
    .filter(a => (a.depuis ?? '').slice(0, 10) <= p.au)
    .filter(a => { const pid = personneDeLAlerte(a); return pid ? idsConducteurs.has(pid) : !site.value || (!!a.vehiculeId && ids.has(a.vehiculeId)) })
  return [
    { titre: 'Synthèse par conducteur', colonnes: ['Conducteur', 'Fonction', libInd('score'), 'Voyages', 'Kilomètres', 'Heures de voyage', 'Écarts non justifiés', 'Infractions', 'Dépassements de temps'],
      lignes: conducteurs.map(c => {
        const l = [...perf.values()].filter(x => x.id === c.id)
        const dep = dispos.depassementsTemps(c.id).filter(d => dansPeriode(d.date, periode.value)).length
        return [c.nomComplet, c.fonctionLibelle, scores.scoreGlobal(c.id), l.reduce((s, x) => s + x.voyages, 0), l.reduce((s, x) => s + x.km, 0), n(l.reduce((s, x) => s + x.heures, 0), 1), l.reduce((s, x) => s + x.ecarts, 0), l.reduce((s, x) => s + x.infractions, 0), dep]
      }),
      note: 'Score de conduite à ce jour ; les autres colonnes portent sur la période et le site choisis.' },
    { titre: `Performance par ${granularite.value}`, colonnes: ['Conducteur', granularite.value === 'jour' ? 'Jour' : 'Semaine', 'Voyages', 'Kilomètres', 'Heures de voyage', 'Écarts non justifiés', 'Infractions'],
      lignes: [...perf.values()].sort((a, b) => a.nom.localeCompare(b.nom) || a.cle.localeCompare(b.cle)).map(e => [e.nom, e.lib, e.voyages, e.km, n(e.heures, 1), e.ecarts, e.infractions]) },
    { titre: 'Échéances de pièces', colonnes: ['Personne', 'Pièce', 'Échéance', 'État'],
      lignes: echeances.map(d => [personnel.parId(d.personnelId)?.nomComplet ?? d.personnelId, docs.libelle(d), fmtDate(d.dateExpiration), ({ proche: 'À renouveler', expire: 'Expirée', absent: 'Absente' } as Record<string, string>)[docs.etat(d)] ?? docs.etat(d)]) },
    { titre: 'Affectations en cours', colonnes: ['Conducteur', 'Véhicule', 'Depuis'],
      lignes: vehicules.affectations.filter(a => !a.dateFin && ids.has(a.vehiculeId) && idsConducteurs.has(a.conducteurId)).map(a => [personnel.parId(a.conducteurId)?.nomComplet ?? a.conducteurId, vehicules.parId(a.vehiculeId)?.immatriculation ?? a.vehiculeId, fmtDate(a.dateDebut)]) },
    { titre: 'Alertes en cours sur les conducteurs', colonnes: ['Catégorie', 'Alerte', 'Détail', 'Depuis'],
      lignes: alertes.map(a => [LIB_CATEGORIE_ALERTE[a.categorie], a.titre, a.message, fmtDate(a.depuis)]) },
  ]
}

/* ── Audit de conformité (FMS-RA-06) ────────────────────────────── */
function sectionsAudit(): SectionRapport[] {
  const liste = reporting.vehiculesDuSite(site.value)
  const ids = new Set(liste.map(v => v.id))
  const dv = useDocumentsVehiculeStore(); const dp = useDocumentsStore()
  const insp = useInspectionsStore(); const dep = useDepartsStore(); const ec = useEcartsStore()
  const conducteurs = [...personnel.conducteurs, ...personnel.aides]
  const vehEnRegle = liste.filter(v => dv.enRegle(v.id)).length
  const condEnRegle = conducteurs.filter(c => dp.enRegle(c.id)).length
  const aptes = liste.filter(v => insp.aptitude(v.id).apte).length
  const autorisations = dep.autorisations.filter(a => ids.has(a.vehiculeId) && dansPeriode(a.demandeeLe, periode.value))
  const ecarts = ec.ecarts.filter(e => liste.some(v => v.immatriculation === e.vehiculePlaque) && dansPeriode(e.detecteLe, periode.value))
  const pct = (a: number, b: number) => b ? Math.round((a / b) * 100) : null
  return [
    { titre: 'Synthèse de conformité', colonnes: ['Contrôle', 'Conformes', 'Total', 'Taux (%)'], lignes: [
      ['Véhicules aux documents en règle', vehEnRegle, liste.length, pct(vehEnRegle, liste.length)],
      ['Conducteurs et aides aux pièces en règle', condEnRegle, conducteurs.length, pct(condEnRegle, conducteurs.length)],
      ['Véhicules aptes à l\'inspection périodique', aptes, liste.length, pct(aptes, liste.length)],
      ['Départs autorisés sur la période', autorisations.filter(a => a.accordee).length, autorisations.length, pct(autorisations.filter(a => a.accordee).length, autorisations.length)],
      ['Écarts de trajet justifiés ou subis', ecarts.filter(e => e.nature === 'autorisee' || e.nature === 'subie').length, ecarts.length, pct(ecarts.filter(e => e.nature === 'autorisee' || e.nature === 'subie').length, ecarts.length)],
    ] },
    { titre: 'Documents de véhicule hors règle', colonnes: ['Véhicule', 'Document', 'Échéance', 'État'],
      lignes: dv.actifs.filter(d => ids.has(d.vehiculeId) && ['proche', 'expire', 'absent', 'annule', 'perdu'].includes(dv.etat(d))).map(d => [vehicules.parId(d.vehiculeId)?.immatriculation ?? d.vehiculeId, dv.libelle(d), fmtDate(d.echeance), dv.etat(d) === 'proche' ? 'À renouveler' : 'Hors validité']) },
    { titre: 'Pièces des conducteurs hors règle', colonnes: ['Personne', 'Pièce', 'Échéance', 'État'],
      lignes: dp.actifs.filter(d => conducteurs.some(c => c.id === d.personnelId) && ['proche', 'expire', 'absent', 'annule', 'perdu'].includes(dp.etat(d))).map(d => [personnel.parId(d.personnelId)?.nomComplet ?? d.personnelId, dp.libelle(d), fmtDate(d.dateExpiration), dp.etat(d) === 'proche' ? 'À renouveler' : 'Hors validité']) },
    { titre: 'Inspections périodiques', colonnes: ['Véhicule', 'Aptitude', 'Motif'],
      lignes: liste.filter(v => vehicules.tracteurs.some(t => t.id === v.id) || insp.aptitude(v.id).inspection).map(v => { const a = insp.aptitude(v.id); return [v.immatriculation, a.apte ? 'Apte' : 'Non apte', a.motif ?? ''] }) },
    { titre: 'Contrôles avant départ de la période', colonnes: ['Autorisation', 'Véhicule', 'Conducteur', 'Décision', 'Contrôles non conformes'],
      lignes: autorisations.map(a => [a.reference, a.vehiculePlaque, a.chauffeurNom, a.decideLe ? (a.accordee ? 'Accordée' : 'Refusée') : 'En attente', a.controles.filter(x => !x.conforme).length]) },
    { titre: 'Écarts de trajet de la période', colonnes: ['Véhicule', 'Voyage', 'Écart', 'Détecté le', 'Qualification'],
      lignes: ecarts.map(e => [e.vehiculePlaque, e.voyageRef, LIB_TYPE_ECART[e.type] ?? e.type, fmtDate(e.detecteLe), LIB_NATURE[e.nature].label]) },
  ]
}

/* ── Rapports du transport ──────────────────────────────────────── */
const numOrdre = (v: Voyage) => v.numeroOT || v.reference
const destinatairesDe = (v: Voyage) => [...new Set(v.etapes.map(e => e.destinataire).filter(Boolean))].join(', ') || v.clientNom
const vehiculeDe = (v: Voyage) => v.moyen === 'externe' ? v.vehiculeTransporteurPlaque : [v.vehiculePlaque, v.semiRemorquePlaque].filter(Boolean).join(' + ')
const fmtJour = (iso?: string) => iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR') : ''
const ouiNon = (b: boolean | null) => b == null ? null : b ? 'Oui' : 'Non'
/** Section d'indicateurs : libellé suivi du code, valeur colorée face à la cible. */
type LigneInd = { lib: string; cle?: CleIndicateur; valeur: number | null; nombre?: number | null; base?: number | null }
function sectionIndicateurs(titre: string, lignes: LigneInd[], avecNombres = false): SectionRapport {
  clesTr.set(titre, { col: avecNombres ? 3 : 1, cles: lignes.map(l => l.cle) })
  const cible = (cle?: CleIndicateur) => cle ? ind.texteCible(cle) : ''
  return {
    titre,
    colonnes: avecNombres ? ['Indicateur', 'Nombre', 'Sur', 'Valeur', 'Cible'] : ['Indicateur', 'Valeur', 'Cible'],
    lignes: lignes.map(l => avecNombres ? [l.lib, l.nombre ?? null, l.base ?? null, l.valeur, cible(l.cle)] : [l.lib, l.valeur, cible(l.cle)]),
  }
}
const ligneHeures = (lib: string, l: LignePonctualite[]) => { const h = rt.syntheseHeures(l); return [lib, h.arrivees, h.alHeure, h.enRetard, h.taux] }
const COLONNES_HEURES = () => ['Livraisons arrivées', "À l'heure", 'En retard', `${ind.libelle('alHeure')} (%)`]

function sectionsActivite(): SectionRapport[] {
  const a = rt.activite(ft())
  const controles = useControlesTransportStore()
  const situation = (v: Voyage) => [voyageEnRetard(v) ? 'Livraison en retard' : '', controles.etatDepassement(v).motif ?? ''].filter(Boolean).join(' ; ')
  const aSuivre = [...new Set([...a.enRetard, ...a.enAlerte])]
  return [
    { titre: "Indicateurs d'activité", colonnes: ['Indicateur', 'Valeur'], lignes: [
      ['Ordres de transport de la période', a.total],
      ['Ordres en retard', a.enRetard.length],
      ['Ordres à la date dépassée', a.enAlerte.length],
      ["Commandes à livrer en attente d'un ordre", a.commandes.length],
    ] },
    { titre: 'Ordres par statut', colonnes: ['Statut', 'Ordres'], lignes: a.parStatut.map(s => [STATUTS_VOYAGE[s.statut].label, s.nb]) },
    { titre: 'Ordres en retard ou à la date dépassée', colonnes: ['Ordre', 'Statut', 'Destinataires', 'Date prévue', 'Situation'],
      lignes: aSuivre.map(v => [numOrdre(v), STATUTS_VOYAGE[v.statut].label, destinatairesDe(v), fmtJour(v.datePlanifiee), situation(v)]) },
    { titre: "Commandes à livrer en attente d'un ordre", colonnes: ['Destinataire', 'Contenu', 'Date souhaitée', 'Poids (kg)', 'Date dépassée'],
      lignes: a.commandes.map(c => [c.destinataire, c.contenu, fmtJour(c.dateSouhaitee), c.poidsKg || null, controles.estExpiree(c) ? 'Oui' : 'Non']) },
  ]
}

function sectionsPonctualite(): SectionRapport[] {
  const f = ft()
  const heures = rt.ponctualite(f)
  const h = rt.syntheseHeures(heures)
  const couts = rt.couts(f)
  const complets = couts.filter(c => c.total != null)
  const jourLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const parTemps = [...grouper(heures.filter(l => l.alHeure != null), l => cleTempsTr(jourLocal(l.reelle!), granularite.value).cle).entries()].sort((x, y) => x[0].localeCompare(y[0]))
  return [
    sectionIndicateurs('Indicateurs de ponctualité et de coût', [
      { lib: libInd('alHeure', '%'), cle: 'alHeure', valeur: h.taux },
      { lib: 'Livraisons arrivées comparées à leur heure prévue', valeur: h.arrivees },
      { lib: 'Livraisons arrivées en retard', valeur: h.enRetard },
      { lib: 'Retard moyen des livraisons en retard (min)', valeur: h.retardMoyen },
      { lib: libInd('coutOrdre', dev()), cle: 'coutOrdre', valeur: n(moyenne(complets.map(c => c.total))) },
      { lib: `Coût des ordres au coût complet (${dev()})`, valeur: n(somme(complets.map(c => c.total))) },
      { lib: 'Ordres exécutés au coût complet', valeur: complets.length },
    ]),
    { titre: `Ponctualité par ${granularite.value}`, colonnes: [granularite.value === 'jour' ? 'Jour' : 'Semaine', ...COLONNES_HEURES()],
      lignes: parTemps.map(([, l]) => ligneHeures(cleTempsTr(jourLocal(l[0]!.reelle!), granularite.value).lib, l)) },
    { titre: 'Ponctualité par client', colonnes: ['Client', ...COLONNES_HEURES()],
      lignes: [...grouper(heures, l => l.etape.destinataire ?? l.etape.siteNom).entries()].sort((x, y) => x[0].localeCompare(y[0], 'fr')).map(([k, l]) => ligneHeures(k, l)) },
    { titre: 'Ponctualité par transporteur', colonnes: ['Transporteur', ...COLONNES_HEURES()],
      lignes: [...grouper(heures, l => rt.transporteurDe(l.voyage)).entries()].sort((x, y) => (x[0] === NOS_MOYENS ? -1 : y[0] === NOS_MOYENS ? 1 : x[0].localeCompare(y[0], 'fr'))).map(([k, l]) => ligneHeures(k, l)) },
    { titre: 'Heure d\'arrivée de chaque livraison', colonnes: ['Ordre', 'Destinataire', 'Transporteur', 'Heure prévue', 'Arrivée réelle', 'Écart', "À l'heure"],
      lignes: heures.map(l => [numOrdre(l.voyage), l.etape.destinataire ?? l.etape.siteNom, rt.transporteurDe(l.voyage), l.prevue ? fmtJourHeure(l.prevue) : null, l.reelle ? fmtJourHeure(l.reelle) : null, l.ecartMin != null ? fmtRetard(l.ecartMin) : null, ouiNon(l.alHeure)]) },
    { titre: 'Coût de chaque ordre de transport', colonnes: ['Ordre', 'Transporteur', 'Distance (km)', `Carburant (${dev()})`, `Véhicule (${dev()})`, `Facture du transporteur (${dev()})`, `Coût total (${dev()})`],
      lignes: couts.map(c => [numOrdre(c.voyage), rt.transporteurDe(c.voyage), c.distance, n(c.carburant), n(c.vehicule), n(c.facture), n(c.total)]) },
  ]
}

function sectionsQualite(): SectionRapport[] {
  const f = ft()
  const q = rt.qualite(f)
  const ordres = rt.executes(f)
  const ordreDe = (id: string) => ordres.find(v => v.etapes.some(e => e.id === id))
  const evenements = q.lignes.flatMap(e => {
    const o = ordreDe(e.id); const num = o ? numOrdre(o) : ''; const dest = e.destinataire ?? e.siteNom
    const l: ValeurRapport[][] = []
    if (e.receptionContesteeLe) l.push([num, dest, e.contestationTraiteeLe ? 'Contestée, traitée' : 'Contestée, à traiter', e.motifContestation, fmtJour(e.receptionContesteeLe)])
    if (estRefusee(e)) l.push([num, dest, 'Refusée', e.motifAnnulationLigne, fmtJour(e.ligneAnnuleeLe)])
    if (estReportee(e)) l.push([num, dest, e.retourEntrepotLe ? 'Reportée, retour au dépôt' : 'Reportée dans la tournée', e.motifRetour ?? e.motifReport, fmtJour(e.retourEntrepotLe ?? e.reporteLe)])
    if (e.franchi && estPartielle(e)) l.push([num, dest, 'Partielle', (e.eBL?.articlesNonLivres ?? []).map(a => `${a.libelle} (${a.motif})`).join(', '), fmtJour(e.livreParChauffeurLe)])
    return l
  })
  return [
    sectionIndicateurs('Indicateurs de qualité de livraison', [
      { lib: libInd('confirmees', '%'), cle: 'confirmees', nombre: q.confirmees, base: q.declarees, valeur: q.tauxConfirmees },
      { lib: libInd('partielles', '%'), cle: 'partielles', nombre: q.partielles, base: q.declarees, valeur: q.tauxPartielles },
      { lib: libInd('contestees', '%'), cle: 'contestees', nombre: q.contestees, base: q.declarees, valeur: q.tauxContestees },
      { lib: libInd('refusees', '%'), cle: 'refusees', nombre: q.refusees, base: q.presentees, valeur: q.tauxRefusees },
      { lib: libInd('reportees', '%'), cle: 'reportees', nombre: q.reportees, base: q.presentees, valeur: q.tauxReportees },
      { lib: libInd('retoursDepot', '%'), cle: 'retoursDepot', nombre: q.retours, base: q.presentees, valeur: q.tauxRetours },
      { lib: libInd('satisfactionDestinataire', 'sur 5'), cle: 'satisfactionDestinataire', nombre: q.reponsesSatisfaction, base: q.confirmees, valeur: q.noteSatisfaction },
      { lib: libInd('satisfactionOrdonnateur', 'sur 5'), cle: 'satisfactionOrdonnateur', nombre: q.reponsesOrdonnateur, base: null, valeur: q.noteOrdonnateur },
    ], true),
    /* Écarts séparés par unité : le carburant en litres à 15 °C, les autres marchandises dans leur unité, jamais additionnés. */
    { titre: 'Écarts de quantité qualifiés', colonnes: ['Unité', 'Qualification', 'Livraisons', 'Écart cumulé'], lignes: q.ecarts.flatMap(x => [
      [x.unite, 'Gain', x.gain.nb, x.gain.nb ? x.gain.quantite : null],
      [x.unite, 'Coulage', x.coulage.nb, x.coulage.nb ? x.coulage.quantite : null],
      [x.unite, 'À qualifier', x.aQualifier, null],
    ] as ValeurRapport[][]) },
    { titre: 'Qualité par client', colonnes: ['Client', 'Livraisons déclarées', `${ind.libelle('confirmees')} (%)`, `${ind.libelle('partielles')} (%)`, `${ind.libelle('contestees')} (%)`, `${ind.libelle('refusees')} (%)`, `${ind.libelle('reportees')} (%)`, `${ind.libelle('satisfactionDestinataire')} (sur 5)`],
      lignes: [...grouper(q.lignes, e => e.destinataire ?? e.siteNom).entries()].sort((x, y) => x[0].localeCompare(y[0], 'fr')).map(([k, l]) => {
        const c = qualiteDe(l); return [k, c.declarees, c.tauxConfirmees, c.tauxPartielles, c.tauxContestees, c.tauxRefusees, c.tauxReportees, c.noteSatisfaction]
      }) },
    { titre: 'Livraisons contestées, refusées, reportées ou partielles', colonnes: ['Ordre', 'Destinataire', 'Situation', 'Motif', 'Date'], lignes: evenements },
  ]
}

function sectionsMoyens(): SectionRapport[] {
  const f = ft()
  const m = rt.moyens(f)
  const tr = rt.transporteurs(f)
  return [
    sectionIndicateurs("Indicateurs d'utilisation des moyens", [
      { lib: libInd('remplissagePoids', '%'), cle: 'remplissagePoids', valeur: moyenne(m.map(x => x.remplissagePoids)) },
      { lib: libInd('remplissageVolume', '%'), cle: 'remplissageVolume', valeur: moyenne(m.map(x => x.remplissageVolume)) },
      { lib: libInd('livraisonsParOrdre'), cle: 'livraisonsParOrdre', valeur: moyenne(m.map(x => x.livraisons)) },
      { lib: libInd('distance', 'km'), cle: 'distance', valeur: somme(m.map(x => x.distance)) },
      { lib: 'Ordres exécutés', valeur: m.length },
    ]),
    { titre: 'Utilisation de chaque ordre de transport', colonnes: ['Ordre', 'Transporteur', 'Véhicule', 'Poids (kg)', 'Charge maximale (kg)', 'Remplissage en poids (%)', 'Volume (m³)', 'Volume utile (m³)', 'Remplissage en volume (%)', 'Livraisons', 'Distance (km)'],
      lignes: m.map(x => [numOrdre(x.voyage), rt.transporteurDe(x.voyage), vehiculeDe(x.voyage), x.poidsKg, x.capaciteKg, x.remplissagePoids, x.volumeM3, x.capaciteM3, x.remplissageVolume, x.livraisons, x.distance]) },
    { titre: 'Performance des transporteurs externes', colonnes: ['Transporteur', 'Ordres confiés', `${ind.libelle('alHeure')} (%)`, `${ind.libelle('confirmees')} (%)`, `${ind.libelle('contestees')} (%)`, `${ind.libelle('refusees')} (%)`, 'Factures reçues', 'Factures en écart', 'Factures sans tarif', `${ind.libelle('ecartFactureTarif')} (${dev()})`],
      lignes: tr.map(t => [t.nom, t.ordres, t.ponctualite, t.confirmees, t.contestees, t.refusees, t.factures, t.facturesEnEcart, t.facturesSansTarif, n(t.ecartMoyen)]) },
  ]
}

const sections = computed<SectionRapport[]>(() => {
  if (erreurFiltres.value) return []
  clesTr.clear()
  switch (onglet.value) {
    case 'synthese': return sectionsSynthese()
    case 'carburant': return sectionsCarburant()
    case 'conducteurs': return sectionsConducteurs()
    case 'audit': return sectionsAudit()
    case 'tr_activite': return sectionsActivite()
    case 'tr_ponctualite': return sectionsPonctualite()
    case 'tr_qualite': return sectionsQualite()
    case 'tr_moyens': return sectionsMoyens()
  }
  return []
})

function rapport(): Rapport {
  const titre = onglet.value === 'audit' ? "Rapport d'audit de conformité" : `Rapport · ${ONGLETS.find(t => t.key === onglet.value)!.label}`
  const lieu = transport.value ? (perimetreLisible.value || 'tous les dépôts, régions et clients') : (site.value || 'tous les sites')
  return { titre, periode: libellePeriode(periode.value), sousTitre: `${libellePeriode(periode.value)} · ${lieu} · édité le ${maintenant().toLocaleDateString('fr-FR')}`, sections: sections.value }
}
</script>
