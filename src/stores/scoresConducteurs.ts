import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useEcartsStore } from './ecarts'
import { useDocumentsStore } from './documentsPersonnel'
import { useVoyagesStore } from './voyages'
import { usePersonnelStore } from './personnel'
import { aujourdhuiISO } from '../utils/horloge'
import { useEcoconduiteStore, type EvenementEco } from './ecoconduite'
import { useInfractionsStore } from './infractions'
import { useTelematiqueStore, type EvenementTelematique } from './telematique'
import { useFormationsStore } from './formations'
import { useTypesDocumentsStore } from './typesDocuments'

export type FamilleScore = 'securite' | 'itineraire' | 'reglementaire' | 'livraison' | 'discipline' | 'ecoconduite'

/** Poids et couleurs repris tels quels du socle FMS : une méthodologie de notation, pas un équipement. */
export const PONDERATIONS: Record<FamilleScore, { libelle: string; poids: number; couleur: string }> = {
  securite: { libelle: 'Sécurité routière', poids: 30, couleur: '#dc2626' },
  itineraire: { libelle: "Conformité d'itinéraire", poids: 25, couleur: '#0072C5' },
  reglementaire: { libelle: 'Conformité réglementaire', poids: 20, couleur: '#ca8a04' },
  livraison: { libelle: 'Qualité de livraison', poids: 15, couleur: '#16a34a' },
  discipline: { libelle: 'Discipline administrative', poids: 10, couleur: '#7c3aed' },
  /** Poids réglable (Configuration, onglet Carburant) ; les poids affichés sont ramenés à 100 %. */
  ecoconduite: { libelle: 'Écoconduite', poids: 10, couleur: '#0d9488' },
}

/** Barème du score réglable par l'entreprise (FMS-PA-05) : points retirés par
 *  événement et plafond quand une pièce obligatoire n'est pas en règle. */
export interface BaremeScore {
  arretCritique: number; arretAutre: number; ecartItineraire: number; voyageLitige: number
  plafondPieceManquante: number
}
export const BAREME_DEFAUT: BaremeScore = {
  arretCritique: 25, arretAutre: 10, ecartItineraire: 20, voyageLitige: 20, plafondPieceManquante: 60,
}
export const LIB_BAREME: Record<keyof BaremeScore, string> = {
  arretCritique: 'Points par arrêt non justifié critique', arretAutre: 'Points par autre arrêt ou repos non justifié',
  ecartItineraire: "Points par écart d'itinéraire non justifié", voyageLitige: 'Points par voyage en litige',
  plafondPieceManquante: "Note plafond si une pièce obligatoire n'est pas en règle",
}

export interface DetailFamilleScore { famille: FamilleScore; libelle: string; poids: number; note: number; evenements: number; calcul: string }

export const useScoresConducteursStore = defineStore('scoresConducteurs', () => {
  const ecartsStore = useEcartsStore()
  const docsStore = useDocumentsStore()
  const voyagesStore = useVoyagesStore()
  const personnelStore = usePersonnelStore()
  const ecoStore = useEcoconduiteStore()
  const telematique = useTelematiqueStore()
  const infractions = useInfractionsStore()
  const formations = useFormationsStore()
  const typesDocs = useTypesDocumentsStore()

  /** Poids et activation de chaque famille, réglables par entreprise (FMS-SC-07). */
  const CLE_POIDS = 'fms-ucodis-ponderations-score'
  const ponderations = ref<Record<FamilleScore, { poids: number; actif: boolean }>>(
    Object.fromEntries(Object.entries(PONDERATIONS).map(([k, v]) => [k, { poids: v.poids, actif: true }])) as Record<FamilleScore, { poids: number; actif: boolean }>)
  try { const b = localStorage.getItem(CLE_POIDS); if (b) Object.assign(ponderations.value, JSON.parse(b)) } catch { /* défaut */ }
  watch(ponderations, v => { try { localStorage.setItem(CLE_POIDS, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  function reinitialiserPonderations() {
    Object.entries(PONDERATIONS).forEach(([k, v]) => { ponderations.value[k as FamilleScore] = { poids: v.poids, actif: true } })
  }

  const bareme = ref<BaremeScore>({ ...BAREME_DEFAUT })
  try {
    const b = localStorage.getItem('fms-ucodis-bareme-score')
    if (b) { const lu = JSON.parse(b) as Record<string, number>; (Object.keys(BAREME_DEFAUT) as (keyof BaremeScore)[]).forEach(k => { if (typeof lu[k] === 'number') bareme.value[k] = lu[k]! }) }
  } catch { /* défaut */ }
  watch(bareme, v => { try { localStorage.setItem('fms-ucodis-bareme-score', JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  function reinitialiserBareme() { bareme.value = { ...BAREME_DEFAUT } }

  /* Seul un écart qualifié « non justifié » alimente le score. Un comportement
     remonté par la télématique n'a pas de qualification propre : il ne compte
     qu'une fois confirmé, c'est-à-dire rattaché à une infraction clôturée dont
     la suite ne la lève pas. */
  function comportementConfirme(e: EvenementTelematique): boolean {
    const i = e.infractionId ? infractions.getById(e.infractionId) : undefined
    return !!i && infractions.retenue(i)
  }

  /** Écarts d'itinéraire ; les autres écarts (arrêts, repos) relèvent de la sécurité. */
  const TYPES_ITINERAIRE = ['sortie_trajet', 'point_passage_manque', 'ordre_passage', 'temps_trajet', 'ecart_kilometrique', 'fenetre_horaire']
  /** Écoconduite : une accélération brusque compte une fois confirmée comme
   *  un comportement ; un ralenti prolongé compte s'il a eu lieu pendant un
   *  arrêt qualifié « non justifié » le même jour. Même règle pour le score
   *  du conducteur et pour le suivi par véhicule. */
  function evenementEcoCompte(e: EvenementEco): boolean {
    if (e.type === 'acceleration_brusque') { const t = telematique.getById(e.id); return !!t && comportementConfirme(t) }
    return ecartsStore.ecartsDuChauffeur(e.conducteurId).some(x => x.nature === 'non_justifiee' && !TYPES_ITINERAIRE.includes(x.type) && x.detecteLe.slice(0, 10) === e.date.slice(0, 10))
  }

  /** Détail du score. Avec une date (AAAA-MM-JJ), même formule limitée aux
   *  événements datés de ce jour ou d'avant : le score tel qu'il était alors. */
  function familles(conducteurId: string, au?: string): DetailFamilleScore[] {
    const avant = (d?: string) => !au || (!!d && d.slice(0, 10) <= au)
    const ecarts = ecartsStore.ecartsDuChauffeur(conducteurId).filter(e => e.nature === 'non_justifiee' && avant(e.qualifieLe ?? e.detecteLe))
    /* Chaque écart compte une seule fois, dans la famille de son type : les
       écarts d'itinéraire en Itinéraire, les arrêts et repos en Sécurité. */
    const ITINERAIRE = TYPES_ITINERAIRE
    const ecartsItineraire = ecarts.filter(e => ITINERAIRE.includes(e.type)).length
    const ecartsArret = ecarts.filter(e => !ITINERAIRE.includes(e.type))
    const critiques = ecartsArret.filter(e => e.gravite === 'critique').length
    const majeurs = ecartsArret.filter(e => e.gravite !== 'critique').length
    const pieces = docsStore.piecesManquantes(conducteurId).map(c => typesDocs.libelle(c))
    const docsOk = au ? docsStore.enRegleAu(conducteurId, au) : docsStore.enRegle(conducteurId)
    const voyages = voyagesStore.voyages.filter(v => v.chauffeurId === conducteurId && avant(v.dateDepartReel ?? v.datePlanifiee))
    const voyagesEnLitige = voyages.filter(v => v.statut === 'litige').length

    const pen = (x: number) => Number.isFinite(x) ? Math.max(0, x) : 0
    const tp = telematique.parametres
    /* Comportements à risque confirmés (famille Sécurité routière). */
    const comportements = telematique.duConducteur(conducteurId).filter(e => avant(e.date) && telematique.typeDe(e.code)?.score && comportementConfirme(e))
    const tel = { critique: 0, majeur: 0, mineur: 0 }
    comportements.forEach(e => { tel[telematique.typeDe(e.code)!.gravite]++ })
    const pointsTel = tel.critique * pen(tp.penaliteCritique) + tel.majeur * pen(tp.penaliteMajeur) + tel.mineur * pen(tp.penaliteMineur)

    /* Écoconduite : une accélération brusque compte une fois confirmée comme
       un comportement ; un ralenti prolongé compte s'il a eu lieu pendant un
       arrêt qualifié « non justifié » le même jour. */
    const ep = ecoStore.parametres
    const evEco = ecoStore.evenementsDuConducteur(conducteurId).filter(e => avant(e.date))
    const accel = evEco.filter(e => e.type === 'acceleration_brusque' && evenementEcoCompte(e)).length
    const ralentis = evEco.filter(e => e.type === 'ralenti_prolonge' && evenementEcoCompte(e)).length
    const noteEco = Math.max(0, 100 - accel * pen(ep.penaliteAcceleration) - ralentis * pen(ep.penaliteRalenti))

    /* Infractions saisies (procès-verbal, constat) retenues : celles remontées
       par la télématique sont déjà comptées par leur événement. */
    const saisies = infractions.infractions.filter(i => i.conducteurId === conducteurId && i.source === 'saisie' && avant(i.date) && infractions.retenue(i))
    const inf = { grave: saisies.filter(i => i.gravite === 'grave').length, majeure: saisies.filter(i => i.gravite === 'majeure').length, mineure: saisies.filter(i => i.gravite === 'mineure').length }
    const b = bareme.value
    const pointsInf = inf.grave * pen(tp.penaliteCritique) + inf.majeure * pen(tp.penaliteMajeur) + inf.mineure * pen(tp.penaliteMineur)
    const liste: DetailFamilleScore[] = [
      { famille: 'securite', libelle: PONDERATIONS.securite.libelle, poids: ponderations.value.securite.poids,
        evenements: critiques + majeurs + comportements.length, note: Math.max(0, 100 - critiques * pen(b.arretCritique) - majeurs * pen(b.arretAutre) - pointsTel),
        calcul: `100, moins ${b.arretCritique} par arrêt non justifié critique (${critiques}), moins ${b.arretAutre} par autre arrêt ou repos non justifié (${majeurs}), moins ${tp.penaliteCritique}, ${tp.penaliteMajeur} et ${tp.penaliteMineur} par comportement à risque critique (${tel.critique}), majeur (${tel.majeur}) et mineur (${tel.mineur}) confirmé par une infraction retenue.` },
      { famille: 'itineraire', libelle: PONDERATIONS.itineraire.libelle, poids: ponderations.value.itineraire.poids,
        evenements: ecartsItineraire, note: Math.max(0, 100 - ecartsItineraire * pen(b.ecartItineraire)),
        calcul: `100, moins ${b.ecartItineraire} par écart d'itinéraire qualifié « non justifié » (${ecartsItineraire}).` },
      { famille: 'reglementaire', libelle: PONDERATIONS.reglementaire.libelle, poids: ponderations.value.reglementaire.poids,
        evenements: pieces.length, note: docsOk ? 100 : Math.min(100, pen(b.plafondPieceManquante)),
        calcul: `100 si toutes les pièces obligatoires du conducteur sont valides, sinon ${b.plafondPieceManquante} au plus${pieces.length ? ` (non en règle : ${pieces.join(', ')})` : ''}.` },
      { famille: 'livraison', libelle: PONDERATIONS.livraison.libelle, poids: ponderations.value.livraison.poids,
        evenements: voyagesEnLitige, note: Math.max(0, 100 - voyagesEnLitige * pen(b.voyageLitige)),
        calcul: `100, moins ${b.voyageLitige} par voyage resté en litige (${voyagesEnLitige}).` },
      { famille: 'discipline', libelle: PONDERATIONS.discipline.libelle, poids: ponderations.value.discipline.poids,
        evenements: saisies.length, note: Math.max(0, 100 - pointsInf),
        calcul: `100, moins ${tp.penaliteCritique}, ${tp.penaliteMajeur} et ${tp.penaliteMineur} par infraction saisie et retenue grave (${inf.grave}), majeure (${inf.majeure}) et mineure (${inf.mineure}).` },
      { famille: 'ecoconduite', libelle: PONDERATIONS.ecoconduite.libelle, poids: ponderations.value.ecoconduite.poids,
        evenements: accel + ralentis, note: noteEco,
        calcul: `100, moins ${ep.penaliteAcceleration} par accélération brusque confirmée (${accel}) et ${ep.penaliteRalenti} par ralenti de plus de ${ep.ralentiMinMinutes} min pendant un arrêt non justifié (${ralentis}).` },
    ]
    // Familles désactivées retirées ; poids ramenés à 100 % pour l'affichage comme pour le calcul.
    const actives = liste.filter(x => ponderations.value[x.famille]?.actif !== false)
    const total = actives.reduce((s, x) => s + x.poids, 0)
    return total ? actives.map(x => ({ ...x, poids: Math.round((x.poids * 100) / total) })) : actives
  }

  function scoreGlobal(conducteurId: string, au?: string): number {
    const f = familles(conducteurId, au)
    const total = f.reduce((s, x) => s + x.poids, 0)
    if (!total) return 100
    return Math.round(f.reduce((s, x) => s + x.note * x.poids, 0) / total)
  }

  /** Score à la fin du mois précédent : même formule, appliquée aux seuls
   *  événements datés jusqu'au dernier jour de ce mois. */
  function scoreMoisPrecedent(conducteurId: string): number {
    const [a, m] = aujourdhuiISO().split('-').map(Number)
    const fin = new Date(Date.UTC(a!, m! - 1, 0)).toISOString().slice(0, 10)
    return scoreGlobal(conducteurId, fin)
  }

  /** Évolution par rapport à la fin du mois précédent. */
  function delta(conducteurId: string): number {
    return scoreGlobal(conducteurId) - scoreMoisPrecedent(conducteurId)
  }

  /** Percentile : part des conducteurs dont le score est inférieur ou égal. */
  function percentile(conducteurId: string) {
    const scores = personnelStore.conducteurs.map(c => scoreGlobal(c.id))
    const mine = scoreGlobal(conducteurId)
    const inferieurs = scores.filter(s => s <= mine).length
    return Math.round((inferieurs / scores.length) * 100)
  }

  const classement = computed(() => [...personnelStore.conducteurs].map(c => ({ id: c.id, score: scoreGlobal(c.id) })).sort((a, b) => b.score - a.score))

  /* Formation selon le score (FMS-SC-07) : dès qu'un conducteur passe sous le
     seuil, une formation « à planifier » lui est proposée, ce qui fait partir
     l'alerte « Formations ». Pas de doublon : rien n'est proposé s'il a déjà
     une formation en cours, ni deux fois dans le même mois. */
  function proposerFormations() {
    const seuil = formations.seuilScore
    const mois = aujourdhuiISO().slice(0, 7)
    classement.value.forEach(({ id, score }) => {
      if (score >= seuil || formations.enCours(id)) return
      const origineRef = `Score ${mois}`
      if (formations.formations.some(f => f.conducteurId === id && f.motif === 'score' && f.origineRef === origineRef)) return
      formations.declencher({ conducteurId: id, theme: `Score de conduite de ${score}/100, sous le seuil de ${seuil}`, motif: 'score', origineRef }, 'Score de conduite')
    })
  }
  watch([classement, () => formations.seuilScore], proposerFormations, { immediate: true })

  return { bareme, reinitialiserBareme, ponderations, reinitialiserPonderations, familles, evenementEcoCompte, scoreGlobal, delta, scoreMoisPrecedent, percentile, classement }
})
