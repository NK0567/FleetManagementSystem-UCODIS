import { maintenantMs, maintenant, isoJour } from '../utils/horloge'
import { devise } from '../lib/monnaie'
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useVehiculeStore } from './vehicules'
import { useMaintenanceStore } from './maintenance'

/**
 * Pneumatique, spécificité de la maintenance : chaque pneu est suivi
 * individuellement par un identifiant unique, de son achat à sa sortie.
 * Les plans de positions se paramètrent par type de véhicule (essieux,
 * roues simples ou jumelées, roues de secours) ; les seuils (pression,
 * sculpture, rotation) se paramètrent aussi.
 */
export type StatutPneu = 'stock' | 'monte' | 'rechapage' | 'rebut'
export const LIB_STATUT_PNEU: Record<StatutPneu, string> = { stock: 'En stock', monte: 'Monté', rechapage: 'En rechapage', rebut: 'Au rebut' }

export interface PositionPneu { code: string; libelle: string; essieu: string; x: number; y: number; secours?: boolean
  /** Rang de l'essieu (0 = avant) et côté de la roue : ce qui fait le sens de la position. */
  rang?: number; cote?: string }

/** Plan de positions d'un type de véhicule : ses essieux, de l'avant vers
 *  l'arrière, chacun en roues simples ou jumelées, et ses roues de secours. */
export interface EssieuPlan { libelle: string; jumele: boolean }
export interface ConfigPlanPneus { essieux: EssieuPlan[]; secours: number }
export const PLANS_PNEUS_DEFAUT: Record<string, ConfigPlanPneus> = {
  tracteur: { essieux: [{ libelle: 'Essieu avant (direction)', jumele: false }, { libelle: 'Essieu arrière (traction)', jumele: true }], secours: 1 },
  semi_remorque: { essieux: [{ libelle: 'Essieu 1', jumele: false }, { libelle: 'Essieu 2', jumele: false }, { libelle: 'Essieu 3', jumele: false }], secours: 0 },
  citerne: { essieux: [{ libelle: 'Essieu 1', jumele: false }, { libelle: 'Essieu 2', jumele: false }, { libelle: 'Essieu 3', jumele: false }], secours: 1 },
}
const CLE_PLANS = 'fms-ucodis-plans-pneus'

/** Positions d'un plan : numérotées de l'avant vers l'arrière, de gauche à
 *  droite ; les roues de secours portent les codes S1, S2… x, y : place sur
 *  le schéma (0 à 100). */
export function positionsDuPlan(cfg: ConfigPlanPneus): PositionPneu[] {
  const out: PositionPneu[] = []
  const n = cfg.essieux.length
  let num = 0
  cfg.essieux.forEach((e, i) => {
    const y = n <= 1 ? 50 : Math.round(15 + i * (70 / (n - 1)))
    const roues: [string, number][] = e.jumele
      ? [['gauche extérieur', 14], ['gauche intérieur', 30], ['droit intérieur', 70], ['droit extérieur', 86]]
      : [['gauche', 30], ['droit', 70]]
    roues.forEach(([cote, x]) => out.push({ code: String(++num), libelle: `${e.libelle}, ${cote}`, essieu: e.libelle, x, y, rang: i, cote }))
  })
  for (let k = 1; k <= cfg.secours; k++) {
    const y = n <= 1 ? 80 : Math.round(15 + (70 / (n - 1)) / 2)
    out.push({ code: `S${k}`, libelle: cfg.secours > 1 ? `Roue de secours ${k}` : 'Roue de secours', essieu: 'Secours', x: 50, y: y + (k - 1) * 14, secours: true })
  }
  return out
}

export interface RelevePneu { date: string; pressionBar: number; sculptureMm: number; par: string }
export interface EvenementPneu { date: string; type: 'achat' | 'montage' | 'demontage' | 'releve' | 'rotation' | 'rechapage' | 'retour_rechapage' | 'rebut'; detail: string }
export interface Pneu {
  id: string
  numeroSerie: string
  marque: string
  taille: string
  profil?: string
  indiceChargeVitesse?: string
  dateFabrication?: string
  /** Faux une fois le pneu rechapé. */
  neuf: boolean
  fournisseur?: string
  prixAr: number
  dateAchat: string
  statut: StatutPneu
  vehiculeId?: string
  vehiculePlaque?: string
  positionCode?: string
  kmVehiculeAuMontage?: number
  /** Kilomètres parcourus lors des montages précédents. */
  kmCumules: number
  /** Montages terminés, avec le véhicule et les kilomètres faits dessus :
   *  le coût du pneu se répartit entre les véhicules qui l'ont porté. */
  montages?: { vehiculeId: string; vehiculePlaque: string; km: number }[]
  kmDerniereRotation?: number
  derniereRotationLe?: string
  nbRechapages: number
  coutRechapagesAr: number
  motifRetrait?: string
  releves: RelevePneu[]
  historique: EvenementPneu[]
}
export interface SeuilsPneus { pressionMinBar: number; sculptureMinMm: number; rotationKm: number; rotationMois: number }
const SEUILS_DEFAUT: SeuilsPneus = { pressionMinBar: 7, sculptureMinMm: 2, rotationKm: 30_000, rotationMois: 6 }
const CLE_SEUILS = 'fms-ucodis-seuils-pneus'

function seed(): Pneu[] {
  const out: Pneu[] = []
  const evAchat = (d: string, f: string): EvenementPneu => ({ date: d, type: 'achat', detail: `Achat chez ${f}` })
  // Tracteur 4021 TBA : six roues et une roue de secours
  const tr = [
    ['EP08203T705/017', 16, 8.0], ['EP08172Q810/400', 14, 8.0], ['EP08201Q815/860', 9, 7.5], ['EP08196E810/682', 1.8, 7.8],
    ['EP08163T707/293', 10, 6.5], ['EP08201Q815/861', 11, 8.0], ['EP08203Q814/833', 16, 8.0],
  ] as const
  tr.forEach(([serie, sculpt, press], i) => out.push({
    id: `PN-${String(i + 1).padStart(4, '0')}`, numeroSerie: serie, marque: 'Triangle', taille: '315/80R22,5', profil: 'Pneu traction',
    indiceChargeVitesse: '154/151M', dateFabrication: '3324', neuf: true, fournisseur: 'Pneus Océan Indien', prixAr: 1_450_000, dateAchat: '2025-01-20',
    statut: 'monte', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA', positionCode: i === 6 ? 'S1' : String(i + 1), kmVehiculeAuMontage: 152_000, kmCumules: 0,
    kmDerniereRotation: i === 2 ? 152_000 : 171_000, derniereRotationLe: i === 2 ? '2025-01-30' : '2026-06-12', nbRechapages: 0, coutRechapagesAr: 0,
    releves: [{ date: '2026-08-26T08:00:00', pressionBar: press, sculptureMm: sculpt, par: 'Rakoto Andrianina' }],
    historique: [evAchat('2025-01-20', 'Pneus Océan Indien'), { date: '2025-01-30', type: 'montage', detail: `Monté sur 4021 TBA, position ${i === 6 ? 'S1' : i + 1}` }],
  }))
  // Semi-remorque RM 4101 : 6 positions
  for (let i = 0; i < 6; i++) out.push({
    id: `PN-${String(i + 8).padStart(4, '0')}`, numeroSerie: `RE0702${i}R40${i}`, marque: 'Triangle', taille: '385/65R22,5', profil: 'Pneu traction',
    indiceChargeVitesse: '156/L', dateFabrication: '2624', neuf: i !== 2, fournisseur: 'Pneus Océan Indien', prixAr: 1_250_000, dateAchat: '2025-03-04',
    statut: 'monte', vehiculeId: 'v-sr-1', vehiculePlaque: 'RM 4101', positionCode: String(i + 1), kmVehiculeAuMontage: 0, kmCumules: i === 2 ? 64_000 : 0,
    nbRechapages: i === 2 ? 1 : 0, coutRechapagesAr: i === 2 ? 380_000 : 0, kmDerniereRotation: 0, derniereRotationLe: '2026-06-12',
    releves: [{ date: '2026-08-26T08:30:00', pressionBar: 8.5, sculptureMm: i === 2 ? 6 : 12, par: 'Rakoto Andrianina' }],
    historique: [evAchat('2025-03-04', 'Pneus Océan Indien'), { date: '2025-03-10', type: 'montage', detail: `Monté sur RM 4101, position ${i + 1}` }],
  })
  // Stock, rechapage, rebut
  out.push(
    { id: 'PN-0014', numeroSerie: 'EP09114T120/551', marque: 'Triangle', taille: '315/80R22,5', profil: 'Pneu direction', indiceChargeVitesse: '154/151M', dateFabrication: '1226',
      neuf: true, fournisseur: 'Pneus Océan Indien', prixAr: 1_480_000, dateAchat: '2026-07-15', statut: 'stock', kmCumules: 0, nbRechapages: 0, coutRechapagesAr: 0,
      releves: [], historique: [evAchat('2026-07-15', 'Pneus Océan Indien')] },
    { id: 'PN-0015', numeroSerie: 'EP09114T120/552', marque: 'Triangle', taille: '315/80R22,5', profil: 'Pneu direction', indiceChargeVitesse: '154/151M', dateFabrication: '1226',
      neuf: true, fournisseur: 'Pneus Océan Indien', prixAr: 1_480_000, dateAchat: '2026-07-15', statut: 'stock', kmCumules: 0, nbRechapages: 0, coutRechapagesAr: 0,
      releves: [], historique: [evAchat('2026-07-15', 'Pneus Océan Indien')] },
    { id: 'PN-0016', numeroSerie: 'DC07733A221/090', marque: 'Double Coin', taille: '315/80R22,5', profil: 'Pneu traction', neuf: true, fournisseur: 'Pneus Océan Indien',
      prixAr: 1_200_000, dateAchat: '2024-02-01', statut: 'rechapage', kmCumules: 118_000, nbRechapages: 0, coutRechapagesAr: 0, motifRetrait: 'Sculpture à 2 mm, carcasse saine',
      montages: [{ vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA', km: 118_000 }],
      releves: [{ date: '2026-08-02T08:00:00', pressionBar: 8, sculptureMm: 2, par: 'Rakoto Andrianina' }],
      historique: [evAchat('2024-02-01', 'Pneus Océan Indien'), { date: '2024-02-10', type: 'montage', detail: 'Monté sur 4022 TBA, position 3' },
        { date: '2026-08-05', type: 'rechapage', detail: 'Envoyé au rechapage : sculpture à 2 mm, carcasse saine (retiré de 4022 TBA, position 3)' }] },
    { id: 'PN-0017', numeroSerie: 'DC07733A221/091', marque: 'Double Coin', taille: '315/80R22,5', profil: 'Pneu traction', neuf: false, fournisseur: 'Pneus Océan Indien',
      prixAr: 1_200_000, dateAchat: '2024-02-01', statut: 'rebut', kmCumules: 171_000, nbRechapages: 1, coutRechapagesAr: 390_000, motifRetrait: 'Éclatement, carcasse endommagée',
      montages: [{ vehiculeId: 'v-tr-3', vehiculePlaque: '4023 TBA', km: 104_000 }, { vehiculeId: 'v-tr-5', vehiculePlaque: '4025 TBA', km: 67_000 }],
      releves: [], historique: [evAchat('2024-02-01', 'Pneus Océan Indien'), { date: '2024-02-10', type: 'montage', detail: 'Monté sur 4023 TBA, position 4' },
        { date: '2025-05-12', type: 'demontage', detail: 'Démonté de 4023 TBA, position 4 : envoi au rechapage' },
        { date: '2025-06-20', type: 'montage', detail: 'Monté sur 4025 TBA, position 5' },
        { date: '2026-06-18', type: 'rebut', detail: 'Mis au rebut : éclatement, carcasse endommagée (retiré de 4025 TBA, position 5)' }] },
  )
  return out
}

export const usePneusStore = defineStore('pneus', () => {
  const vehicules = useVehiculeStore()
  const pneus = ref<Pneu[]>(seed())
  let initialSeuils = SEUILS_DEFAUT
  try { const b = localStorage.getItem(CLE_SEUILS); if (b) initialSeuils = { ...SEUILS_DEFAUT, ...JSON.parse(b) } } catch { /* défaut */ }
  const seuils = ref<SeuilsPneus>(initialSeuils)
  watch(seuils, v => { try { localStorage.setItem(CLE_SEUILS, JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })

  /* Plans de positions par type de véhicule, paramétrables. */
  const plans = ref<Record<string, ConfigPlanPneus>>(structuredClone(PLANS_PNEUS_DEFAUT))
  try { const b = localStorage.getItem(CLE_PLANS); if (b) Object.assign(plans.value, JSON.parse(b)) } catch { /* défaut */ }
  watch(plans, v => { try { localStorage.setItem(CLE_PLANS, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  const planDuType = (type: string): PositionPneu[] => plans.value[type] ? positionsDuPlan(plans.value[type]!) : []

  const getById = (id: string) => pneus.value.find(p => p.id === id)
  const kmVehicule = (vehiculeId?: string) => vehicules.liste.find(v => v.id === vehiculeId)?.kilometrage ?? 0
  const planDuVehicule = (vehiculeId: string): PositionPneu[] => {
    const v = vehicules.liste.find(x => x.id === vehiculeId)
    return v ? planDuType(v.type) : []
  }
  const positionDe = (p: Pneu) => p.vehiculeId ? planDuVehicule(p.vehiculeId).find(x => x.code === p.positionCode) : undefined

  /** Change le plan d'un type : refusé s'il retire ou déplace une position
   *  où un pneu est monté. */
  function modifierPlan(type: string, cfg: ConfigPlanPneus): { ok: boolean; motif?: string } {
    if (!cfg.essieux.length) return { ok: false, motif: 'Le plan compte au moins un essieu.' }
    if (cfg.essieux.some(e => !e.libelle.trim())) return { ok: false, motif: "Le libellé d'un essieu ne peut pas être vide." }
    if (!Number.isInteger(cfg.secours) || cfg.secours < 0 || cfg.secours > 4) return { ok: false, motif: 'Le nombre de roues de secours va de 0 à 4.' }
    const nouveau = { essieux: cfg.essieux.map(e => ({ libelle: e.libelle.trim(), jumele: e.jumele })), secours: cfg.secours }
    const positions = positionsDuPlan(nouveau)
    const ancien = planDuType(type)
    const touches = pneus.value.filter(p => p.statut === 'monte' && vehicules.liste.find(v => v.id === p.vehiculeId)?.type === type)
      .filter(p => { const a = ancien.find(x => x.code === p.positionCode); const n = positions.find(x => x.code === p.positionCode); return !n || !a || a.rang !== n.rang || a.cote !== n.cote || a.secours !== n.secours })
    if (touches.length) return { ok: false, motif: `Des pneus sont montés sur des positions que ce changement supprime ou déplace (${touches.slice(0, 3).map(p => `${p.vehiculePlaque} position ${p.positionCode}`).join(', ')}) : démontez-les d'abord.` }
    plans.value[type] = nouveau
    return { ok: true }
  }
  const pneusDuVehicule = (vehiculeId: string) => pneus.value.filter(p => p.statut === 'monte' && p.vehiculeId === vehiculeId)

  /** Kilomètres parcourus par le pneu : montages précédents + montage en cours. */
  function kmParcourus(p: Pneu): number {
    const enCours = p.statut === 'monte' ? Math.max(0, kmVehicule(p.vehiculeId) - (p.kmVehiculeAuMontage ?? 0)) : 0
    return p.kmCumules + enCours
  }
  const coutTotal = (p: Pneu) => p.prixAr + p.coutRechapagesAr
  /** Kilomètres faits sur chaque véhicule qui a porté le pneu, montage en cours compris. */
  function kmParVehicule(p: Pneu): { vehiculeId: string; km: number }[] {
    const out: { vehiculeId: string; km: number }[] = []
    const ajouter = (vehiculeId: string, km: number) => { const e = out.find(x => x.vehiculeId === vehiculeId); if (e) e.km += km; else out.push({ vehiculeId, km }) }
    ;(p.montages ?? []).forEach(m => ajouter(m.vehiculeId, m.km))
    if (p.statut === 'monte' && p.vehiculeId) ajouter(p.vehiculeId, Math.max(0, kmVehicule(p.vehiculeId) - (p.kmVehiculeAuMontage ?? 0)))
    return out
  }
  /** Part du coût du pneu (achat et rechapages) portée par un véhicule, au
   *  prorata des kilomètres faits dessus : un pneu passé d'un véhicule à
   *  l'autre n'est compté qu'une fois. Sans kilomètre encore parcouru, le
   *  coût va au premier véhicule qui l'a porté. */
  function coutPourVehicule(p: Pneu, vehiculeId: string): number {
    const parts = kmParVehicule(p)
    const total = parts.reduce((s, x) => s + x.km, 0)
    if (total > 0) return coutTotal(p) * (parts.find(x => x.vehiculeId === vehiculeId)?.km ?? 0) / total
    return parts[0]?.vehiculeId === vehiculeId ? coutTotal(p) : 0
  }
  /** Coût des pneus portés par un véhicule, montés aujourd'hui ou retirés depuis. */
  const coutPneusDuVehicule = (vehiculeId: string) => Math.round(pneus.value.reduce((s, p) => s + coutPourVehicule(p, vehiculeId), 0))
  /** Garde la trace du véhicule quand le pneu le quitte. */
  function clotureMontage(p: Pneu) {
    if (p.statut !== 'monte' || !p.vehiculeId) return
    p.montages = [...(p.montages ?? []), { vehiculeId: p.vehiculeId, vehiculePlaque: p.vehiculePlaque ?? '', km: Math.max(0, kmVehicule(p.vehiculeId) - (p.kmVehiculeAuMontage ?? 0)) }]
  }
  /** Coût au kilomètre : prix et rechapages divisés par les km parcourus. */
  const coutParKm = (p: Pneu): number | null => { const km = kmParcourus(p); return km > 0 ? coutTotal(p) / km : null }
  const dernierReleve = (p: Pneu) => [...p.releves].sort((a, b) => b.date.localeCompare(a.date))[0]

  /** Seuils d'alerte d'un relevé : la même règle (au seuil ou en dessous)
   *  sert à l'alerte et au surlignage des relevés. */
  const pressionHorsSeuil = (r: RelevePneu) => r.pressionBar <= seuils.value.pressionMinBar
  const sculptureHorsSeuil = (r: RelevePneu) => r.sculptureMm <= seuils.value.sculptureMinMm
  /** Alertes de sécurité d'un pneu monté : pression basse, sculpture au seuil ou en dessous. */
  function alertesSecuriteDe(p: Pneu): string[] {
    if (p.statut !== 'monte') return []
    const out: string[] = []
    const r = dernierReleve(p)
    if (r && pressionHorsSeuil(r)) out.push(`Pression basse (${r.pressionBar} bar)`)
    if (r && sculptureHorsSeuil(r)) out.push(`Sculpture critique (${r.sculptureMm} mm)`)
    return out
  }
  /** Alertes de sécurité, puis rotation à prévoir. */
  function alertesDe(p: Pneu): string[] {
    return [...alertesSecuriteDe(p), ...(rotationDue(p) ? ['Rotation à prévoir'] : [])]
  }
  function rotationDue(p: Pneu): boolean {
    if (p.statut !== 'monte') return false
    if (positionDe(p)?.secours) return false
    const kmDepuis = kmVehicule(p.vehiculeId) - (p.kmDerniereRotation ?? p.kmVehiculeAuMontage ?? 0)
    const depuis = p.derniereRotationLe ?? p.historique.find(e => e.type === 'montage')?.date
    const mois = depuis ? (maintenantMs() - new Date(depuis).getTime()) / (30.44 * 86400000) : 0
    return kmDepuis >= seuils.value.rotationKm || mois >= seuils.value.rotationMois
  }
  const alertes = computed(() => pneus.value.filter(p => alertesSecuriteDe(p).length).map(p => ({ pneu: p, motifs: alertesSecuriteDe(p) })))
  const rotationsAPrevoir = computed(() => pneus.value.filter(rotationDue))

  /* ── Actions ───────────────────────────────────────────────── */
  function creer(d: Omit<Pneu, 'id' | 'statut' | 'kmCumules' | 'nbRechapages' | 'coutRechapagesAr' | 'releves' | 'historique'>): { ok: boolean; motif?: string; id?: string } {
    if (!d.numeroSerie.trim() || !d.marque.trim() || !d.taille.trim()) return { ok: false, motif: 'Indiquez le numéro de série, la marque et la taille.' }
    if (!(d.prixAr > 0)) return { ok: false, motif: "Indiquez le prix d'achat." }
    if (!d.dateAchat || d.dateAchat > isoJour(maintenant())) return { ok: false, motif: "La date d'achat est obligatoire et ne peut pas être dans le futur." }
    if (pneus.value.some(p => p.numeroSerie.toLowerCase() === d.numeroSerie.trim().toLowerCase())) return { ok: false, motif: 'Ce numéro de série est déjà enregistré : chaque pneu a un identifiant unique.' }
    const id = `PN-${maintenantMs().toString(36).toUpperCase()}`
    pneus.value.unshift({ ...d, numeroSerie: d.numeroSerie.trim(), id, statut: 'stock', kmCumules: 0, nbRechapages: 0, coutRechapagesAr: 0, releves: [],
      historique: [{ date: d.dateAchat, type: 'achat', detail: `Achat${d.fournisseur ? ` chez ${d.fournisseur}` : ''}, mis en stock` }] })
    return { ok: true, id }
  }
  function monter(pneuId: string, vehiculeId: string, positionCode: string): { ok: boolean; motif?: string } {
    const p = getById(pneuId); const v = vehicules.liste.find(x => x.id === vehiculeId)
    if (!p || !v) return { ok: false, motif: 'Pneu ou véhicule introuvable.' }
    if (p.statut !== 'stock') return { ok: false, motif: 'Seul un pneu en stock peut être monté.' }
    const pos = planDuVehicule(vehiculeId).find(x => x.code === positionCode)
    if (!pos) return { ok: false, motif: 'Position inconnue pour ce véhicule.' }
    if (pneusDuVehicule(vehiculeId).some(x => x.positionCode === positionCode)) return { ok: false, motif: `La position ${pos.libelle} est déjà occupée : démontez d'abord le pneu en place.` }
    Object.assign(p, { statut: 'monte', vehiculeId, vehiculePlaque: v.immatriculation, positionCode, kmVehiculeAuMontage: v.kilometrage,
      kmDerniereRotation: v.kilometrage, derniereRotationLe: maintenant().toISOString() })
    p.historique.push({ date: maintenant().toISOString(), type: 'montage', detail: `Monté sur ${v.immatriculation}, ${pos.libelle} (${v.kilometrage.toLocaleString('fr-FR')} km)` })
    return { ok: true }
  }
  /** Démontage : le pneu revient en stock avec ses kilomètres cumulés. */
  function demonter(pneuId: string, motif: string) {
    const p = getById(pneuId); if (!p || p.statut !== 'monte') return
    p.kmCumules = kmParcourus(p)
    clotureMontage(p)
    p.historique.push({ date: maintenant().toISOString(), type: 'demontage', detail: `Démonté de ${p.vehiculePlaque}, position ${p.positionCode}${motif ? ` : ${motif}` : ''}` })
    Object.assign(p, { statut: 'stock', vehiculeId: undefined, vehiculePlaque: undefined, positionCode: undefined, kmVehiculeAuMontage: undefined })
  }
  function relever(pneuId: string, pressionBar: number, sculptureMm: number, par: string): { ok: boolean; motif?: string } {
    const p = getById(pneuId); if (!p) return { ok: false, motif: 'Pneu introuvable.' }
    if (!(pressionBar > 0) || !(sculptureMm >= 0)) return { ok: false, motif: 'Indiquez la pression et la profondeur de sculpture.' }
    if (pressionBar > 15 || sculptureMm > 30) return { ok: false, motif: 'Valeur hors plage : vérifiez la saisie (pression en bar, sculpture en mm).' }
    if (p.statut !== 'monte') return { ok: false, motif: 'Le relevé se fait sur un pneu monté.' }
    p.releves.push({ date: maintenant().toISOString(), pressionBar, sculptureMm, par })
    p.historique.push({ date: maintenant().toISOString(), type: 'releve', detail: `Relevé : ${pressionBar} bar, ${sculptureMm} mm (${par})` })
    return { ok: true }
  }
  /** Rotation validée par le technicien : le pneu change de position sur le
   *  même véhicule ; s'il y en a un à la position visée, ils s'échangent. */
  function pivoter(pneuId: string, nouvellePosition: string, technicien: string): { ok: boolean; motif?: string } {
    const p = getById(pneuId)
    if (!p || p.statut !== 'monte' || !p.vehiculeId) return { ok: false, motif: 'Seul un pneu monté peut faire l\'objet d\'une rotation.' }
    if (!technicien.trim()) return { ok: false, motif: 'La rotation doit être validée par un technicien.' }
    if (!useMaintenanceStore().techniciens.some(t => t.actif && t.nom === technicien)) return { ok: false, motif: 'Choisissez un technicien actif de l\'atelier.' }
    if (!planDuVehicule(p.vehiculeId).some(x => x.code === nouvellePosition)) return { ok: false, motif: 'Position inconnue pour ce véhicule.' }
    if (nouvellePosition === p.positionCode) return { ok: false, motif: 'Choisissez une autre position.' }
    const km = kmVehicule(p.vehiculeId); const le = maintenant().toISOString()
    const autre = pneusDuVehicule(p.vehiculeId).find(x => x.positionCode === nouvellePosition)
    const ancienne = p.positionCode
    for (const [x, pos] of [[p, nouvellePosition], ...(autre ? [[autre, ancienne]] : [])] as [Pneu, string][]) {
      x.historique.push({ date: le, type: 'rotation', detail: `Rotation sur ${x.vehiculePlaque} : position ${x.positionCode} vers ${pos}, validée par ${technicien}` })
      x.positionCode = pos; x.kmDerniereRotation = km; x.derniereRotationLe = le
    }
    return { ok: true }
  }
  /** Retrait pour rechapage ou rebut, avec motif ; l'historique reste consultable. */
  function retirer(pneuId: string, destination: 'rechapage' | 'rebut', motif: string): { ok: boolean; motif?: string } {
    const p = getById(pneuId); if (!p) return { ok: false, motif: 'Pneu introuvable.' }
    if (!motif.trim()) return { ok: false, motif: 'Indiquez le motif du retrait.' }
    if (p.statut === 'rebut') return { ok: false, motif: 'Ce pneu est déjà au rebut.' }
    if (p.statut === 'monte') { p.kmCumules = kmParcourus(p); clotureMontage(p) }
    const depuis = p.vehiculePlaque ? ` (retiré de ${p.vehiculePlaque}, position ${p.positionCode})` : ''
    Object.assign(p, { statut: destination, motifRetrait: motif.trim(), vehiculeId: undefined, vehiculePlaque: undefined, positionCode: undefined, kmVehiculeAuMontage: undefined })
    p.historique.push({ date: maintenant().toISOString(), type: destination, detail: `${destination === 'rechapage' ? 'Envoyé au rechapage' : 'Mis au rebut'} : ${motif.trim()}${depuis}` })
    return { ok: true }
  }
  function retourRechapage(pneuId: string, coutAr: number): { ok: boolean; motif?: string } {
    const p = getById(pneuId); if (!p || p.statut !== 'rechapage') return { ok: false, motif: "Ce pneu n'est pas en rechapage." }
    p.statut = 'stock'; p.neuf = false; p.nbRechapages++; p.coutRechapagesAr += coutAr > 0 ? coutAr : 0
    p.historique.push({ date: maintenant().toISOString(), type: 'retour_rechapage', detail: `Retour de rechapage${coutAr > 0 ? ` (${coutAr.toLocaleString('fr-FR')} ${devise()})` : ''}, remis en stock` })
    return { ok: true }
  }
  return { pneus, seuils, plans, planDuType, modifierPlan, positionDe, pressionHorsSeuil, sculptureHorsSeuil, alertesSecuriteDe, rotationsAPrevoir,
    getById, planDuVehicule, pneusDuVehicule, kmParcourus, coutTotal, kmParVehicule, coutPourVehicule, coutPneusDuVehicule, coutParKm, dernierReleve, alertesDe, rotationDue, alertes,
    creer, monter, demonter, relever, pivoter, retirer, retourRechapage }
})
