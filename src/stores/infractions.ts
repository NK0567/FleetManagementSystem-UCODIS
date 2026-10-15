import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { dansNJours, maintenantMs, maintenant } from '../utils/horloge'

/**
 * Infractions de conduite (FMS-SC-05) : saisies à la main ou remontées par la
 * télématique (vitesse, freinage brusque). Chaque dossier suit un statut
 * jusqu'à sa clôture, qui exige une suite décidée : aucune ne reste sans suite.
 * Les types d'infraction se paramètrent.
 */
export type StatutInfraction = 'nouvelle' | 'en_traitement' | 'cloturee'
export type SourceInfraction = 'saisie' | 'telematique'
export type GraviteInfraction = 'mineure' | 'majeure' | 'grave'
export const LIB_STATUT_INFRACTION: Record<StatutInfraction, { label: string; cls: string }> = {
  nouvelle: { label: 'Nouvelle', cls: 'bg-warning-bg text-warning' },
  en_traitement: { label: 'En traitement', cls: 'bg-info-bg text-info' },
  cloturee: { label: 'Clôturée', cls: 'bg-neutral-bg text-neutral' },
}
export const LIB_GRAVITE_INFRACTION: Record<GraviteInfraction, { label: string; cls: string }> = {
  mineure: { label: 'Mineure', cls: 'bg-neutral-bg text-neutral' },
  majeure: { label: 'Majeure', cls: 'bg-warning-bg text-warning' },
  grave: { label: 'Grave', cls: 'bg-danger-bg text-danger' },
}
/**
 * Suites possibles d'une infraction, paramétrables : chacune dit si elle
 * déclenche une formation ciblée et si elle lève l'infraction (qui ne compte
 * alors pas dans le score du conducteur).
 */
export interface SuiteInfraction { code: string; libelle: string; declencheFormation: boolean; leveInfraction: boolean; actif: boolean }
const SUITES_DEFAUT: SuiteInfraction[] = [
  { code: 'rappel', libelle: 'Rappel à l’ordre', declencheFormation: false, leveInfraction: false, actif: true },
  { code: 'avertissement', libelle: 'Avertissement écrit', declencheFormation: false, leveInfraction: false, actif: true },
  { code: 'formation', libelle: 'Formation ciblée', declencheFormation: true, leveInfraction: false, actif: true },
  { code: 'sanction', libelle: 'Sanction disciplinaire', declencheFormation: false, leveInfraction: false, actif: true },
  { code: 'levee', libelle: 'Infraction contestée et levée', declencheFormation: false, leveInfraction: true, actif: true },
  { code: 'amende', libelle: 'Amende payée par le conducteur', declencheFormation: false, leveInfraction: false, actif: true },
]

export interface TypeInfraction { code: string; libelle: string; gravite: GraviteInfraction; actif: boolean }
export interface Infraction {
  id: string
  reference: string
  type: string
  date: string
  lieu: string
  vehiculeId: string
  vehiculePlaque: string
  conducteurId?: string
  conducteurNom?: string
  source: SourceInfraction
  detail: string
  gravite: GraviteInfraction
  montantAmendeAr?: number
  statut: StatutInfraction
  responsable?: string
  /** Code de la suite donnée, dans la liste paramétrable des suites. */
  suite?: string
  commentaireSuite?: string
  historique: { le: string; par: string; action: string }[]
}

const TYPES_DEFAUT: TypeInfraction[] = [
  { code: 'vitesse', libelle: 'Excès de vitesse', gravite: 'majeure', actif: true },
  { code: 'freinage', libelle: 'Freinage brusque', gravite: 'mineure', actif: true },
  { code: 'telephone', libelle: 'Téléphone au volant', gravite: 'majeure', actif: true },
  { code: 'acceleration', libelle: 'Accélération brusque', gravite: 'mineure', actif: true },
  { code: 'somnolence', libelle: 'Somnolence au volant', gravite: 'grave', actif: true },
  { code: 'ceinture', libelle: 'Ceinture non attachée', gravite: 'majeure', actif: true },
  { code: 'camera_masquee', libelle: 'Caméra masquée', gravite: 'grave', actif: true },
  { code: 'temps_conduite', libelle: 'Dépassement du temps de conduite', gravite: 'majeure', actif: true },
  { code: 'feu_rouge', libelle: 'Franchissement de feu ou de stop', gravite: 'grave', actif: true },
  { code: 'surcharge', libelle: 'Surcharge', gravite: 'majeure', actif: true },
]
const SEED: Infraction[] = [
  { id: 'INF-001', reference: 'INF-2026-021', type: 'vitesse', date: dansNJours(-9) + 'T10:42:00', lieu: 'RN2, PK 63', vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA', conducteurId: 'p-011', conducteurNom: 'Mamy Andrianaivo', source: 'telematique', detail: '92 km/h pour une vitesse limitée à 60 km/h pendant 4 min', gravite: 'majeure', statut: 'nouvelle', historique: [{ le: dansNJours(-9) + 'T10:46:00', par: 'Télématique', action: 'Remontée par le boîtier embarqué' }] },
  { id: 'INF-002', reference: 'INF-2026-020', type: 'freinage', date: dansNJours(-12) + 'T15:10:00', lieu: 'RN7, Ambatolampy', vehiculeId: 'v-tr-4', vehiculePlaque: '4024 TBA', conducteurId: 'p-013', conducteurNom: 'Jaona Ratsimbazafy', source: 'telematique', detail: 'Décélération de 0,6 g', gravite: 'mineure', statut: 'en_traitement', responsable: 'Hery Andriamalala', historique: [{ le: dansNJours(-12) + 'T15:12:00', par: 'Télématique', action: 'Remontée par le boîtier embarqué' }, { le: dansNJours(-11) + 'T09:00:00', par: 'Hery Andriamalala', action: 'Prise en charge' }] },
  { id: 'INF-003', reference: 'INF-2026-018', type: 'telephone', date: dansNJours(-30) + 'T08:20:00', lieu: 'Contrôle routier Ankazobe', vehiculeId: 'v-tr-7', vehiculePlaque: '4027 TBA', conducteurId: 'p-016', conducteurNom: 'Nomena Andriantsoa', source: 'saisie', detail: 'Procès-verbal de la gendarmerie', gravite: 'majeure', montantAmendeAr: 60_000, statut: 'cloturee', responsable: 'Hery Andriamalala', suite: 'avertissement', commentaireSuite: 'Entretien avec le conducteur, rappel du règlement intérieur.', historique: [{ le: dansNJours(-29) + 'T08:00:00', par: 'Hery Andriamalala', action: 'Saisie de l’infraction' }, { le: dansNJours(-25) + 'T11:00:00', par: 'Hery Andriamalala', action: 'Clôture : Avertissement écrit' }] },
]
const CLE_TYPES = 'fms-ucodis-types-infractions'
const CLE_SUITES = 'fms-ucodis-suites-infractions'
const CLE = 'fms-ucodis-infractions'

export const useInfractionsStore = defineStore('infractions', () => {
  const types = ref<TypeInfraction[]>(TYPES_DEFAUT.map(t => ({ ...t })))
  const infractions = ref<Infraction[]>(SEED.map(i => ({ ...i, historique: [...i.historique] })))
  try {
    const b = localStorage.getItem(CLE_TYPES)
    if (b) { const lus = JSON.parse(b) as TypeInfraction[]; types.value = [...lus, ...TYPES_DEFAUT.filter(d => !lus.some(t => t.code === d.code)).map(t => ({ ...t }))] }
  } catch { /* défaut */ }
  try { const b = localStorage.getItem(CLE); if (b) infractions.value = JSON.parse(b) } catch { /* défaut */ }
  const suites = ref<SuiteInfraction[]>(SUITES_DEFAUT.map(x => ({ ...x })))
  try { const b = localStorage.getItem(CLE_SUITES); if (b) suites.value = JSON.parse(b) } catch { /* défaut */ }
  watch(suites, v => { try { localStorage.setItem(CLE_SUITES, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  watch(types, v => { try { localStorage.setItem(CLE_TYPES, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  watch(infractions, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  const getById = (id: string) => infractions.value.find(i => i.id === id)
  const libelleType = (code: string) => types.value.find(t => t.code === code)?.libelle ?? code
  /** Suite d'une infraction ; un ancien dossier peut porter le libellé au lieu du code. */
  const suiteDe = (i: Infraction) => i.suite ? suites.value.find(x => x.code === i.suite || x.libelle === i.suite) : undefined
  const libelleSuite = (i: Infraction) => suiteDe(i)?.libelle ?? i.suite ?? ''
  /** Infraction retenue contre le conducteur : clôturée avec une suite qui ne la lève pas. */
  const retenue = (i: Infraction) => i.statut === 'cloturee' && !suiteDe(i)?.leveInfraction
  const ouvertes = computed(() => infractions.value.filter(i => i.statut !== 'cloturee'))
  const duConducteur = (id: string) => infractions.value.filter(i => i.conducteurId === id)
  const trace = (i: Infraction, par: string, action: string) => i.historique.push({ le: maintenant().toISOString(), par, action })

  function enregistrer(d: Omit<Infraction, 'id' | 'reference' | 'statut' | 'historique'>, par: string): { ok: boolean; id?: string; motif?: string } {
    if (!d.type) return { ok: false, motif: "Choisissez le type d'infraction." }
    if (!d.vehiculeId) return { ok: false, motif: 'Choisissez le véhicule.' }
    if (!d.date || new Date(d.date).getTime() > maintenantMs()) return { ok: false, motif: 'Indiquez une date passée.' }
    if (!d.lieu.trim()) return { ok: false, motif: 'Indiquez le lieu.' }
    if (d.montantAmendeAr != null && d.montantAmendeAr < 0) return { ok: false, motif: "Le montant de l'amende ne peut pas être négatif." }
    const doublon = infractions.value.find(i => i.vehiculeId === d.vehiculeId && i.type === d.type && Math.abs(new Date(i.date).getTime() - new Date(d.date).getTime()) < 10 * 60_000)
    if (doublon) return { ok: false, motif: `Cette infraction est déjà enregistrée (${doublon.reference}).` }
    let n = infractions.value.length + 1
    while (infractions.value.some(i => i.id === `INF-${String(n).padStart(3, '0')}`)) n++
    const id = `INF-${String(n).padStart(3, '0')}`
    const annee = d.date.slice(0, 4)
    const numero = Math.max(0, ...infractions.value.filter(x => x.reference.startsWith(`INF-${annee}-`)).map(x => Number(x.reference.split('-')[2]) || 0)) + 1
    const inf: Infraction = { ...d, lieu: d.lieu.trim(), id, reference: `INF-${annee}-${String(numero).padStart(3, '0')}`, statut: 'nouvelle', historique: [] }
    trace(inf, par, d.source === 'telematique' ? 'Remontée par le boîtier embarqué' : 'Saisie de l’infraction')
    infractions.value.unshift(inf)
    return { ok: true, id }
  }
  function prendreEnCharge(id: string, par: string): { ok: boolean; motif?: string } {
    const i = getById(id); if (!i) return { ok: false, motif: 'Infraction introuvable.' }
    if (i.statut !== 'nouvelle') return { ok: false, motif: 'Cette infraction est déjà prise en charge.' }
    i.statut = 'en_traitement'; i.responsable = par; trace(i, par, 'Prise en charge')
    return { ok: true }
  }
  function cloturer(id: string, suite: string, commentaire: string, par: string): { ok: boolean; motif?: string } {
    const i = getById(id); if (!i) return { ok: false, motif: 'Infraction introuvable.' }
    if (i.statut === 'cloturee') return { ok: false, motif: 'Infraction déjà clôturée.' }
    if (!suite) return { ok: false, motif: 'Choisissez la suite donnée : une infraction ne se clôt pas sans suite.' }
    const def = suites.value.find(x => x.code === suite && x.actif)
    if (!def) return { ok: false, motif: "Cette suite n'existe pas ou n'est plus active." }
    if (!commentaire.trim()) return { ok: false, motif: 'Expliquez la suite donnée.' }
    i.statut = 'cloturee'; i.suite = def.code; i.commentaireSuite = commentaire.trim(); i.responsable ??= par
    trace(i, par, `Clôture : ${def.libelle}`)
    return { ok: true }
  }
  function ajouterType(libelle: string, gravite: GraviteInfraction): { ok: boolean; motif?: string } {
    const l = libelle.trim()
    if (!l) return { ok: false, motif: 'Indiquez le libellé.' }
    if (types.value.some(t => t.libelle.toLowerCase() === l.toLowerCase())) return { ok: false, motif: 'Ce type existe déjà.' }
    const base = l.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    let code = base; let n = 2
    while (types.value.some(t => t.code === code)) code = `${base}_${n++}`
    types.value.push({ code, libelle: l, gravite, actif: true })
    return { ok: true }
  }
  function ajouterSuite(libelle: string, declencheFormation: boolean, leveInfraction: boolean): { ok: boolean; motif?: string } {
    const l = libelle.trim()
    if (!l) return { ok: false, motif: 'Indiquez le libellé de la suite.' }
    if (suites.value.some(x => x.libelle.toLowerCase() === l.toLowerCase())) return { ok: false, motif: 'Cette suite existe déjà.' }
    if (declencheFormation && leveInfraction) return { ok: false, motif: "Une suite qui lève l'infraction ne déclenche pas de formation." }
    const base = l.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'suite'
    let code = base; let n = 2
    while (suites.value.some(x => x.code === code)) code = `${base}_${n++}`
    suites.value.push({ code, libelle: l, declencheFormation, leveInfraction, actif: true })
    return { ok: true }
  }
  function reinitialiserSuites() { suites.value = SUITES_DEFAUT.map(x => ({ ...x })) }
  return { types, suites, infractions, getById, libelleType, suiteDe, libelleSuite, retenue, ouvertes, duConducteur, enregistrer, prendreEnCharge, cloturer, ajouterType, ajouterSuite, reinitialiserSuites }
})
