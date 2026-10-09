import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useVehiculeStore } from './vehicules'

/**
 * Pneumatique, spécificité de la maintenance : chaque pneu est suivi
 * individuellement par un identifiant unique, de son achat à sa sortie.
 * Les plans de positions et la fiche d'un pneu reprennent le cahier des
 * charges UCODIS (« Serial pneumatique », plans tracteur et semi-remorque).
 * Les seuils (pression, sculpture, rotation) se paramètrent.
 */
export type StatutPneu = 'stock' | 'monte' | 'rechapage' | 'rebut'
export const LIB_STATUT_PNEU: Record<StatutPneu, string> = { stock: 'En stock', monte: 'Monté', rechapage: 'En rechapage', rebut: 'Au rebut' }

export interface PositionPneu { code: string; libelle: string; essieu: string; x: number; y: number }
/** Plans de positions par type de véhicule, repris du cahier des charges.
 *  x, y : place sur le schéma (0 à 100). */
export const PLANS_PNEUS: Record<string, PositionPneu[]> = {
  tracteur: [
    { code: '1', libelle: 'Avant gauche', essieu: 'Essieu avant (direction)', x: 30, y: 16 },
    { code: '2', libelle: 'Avant droit', essieu: 'Essieu avant (direction)', x: 70, y: 16 },
    { code: '3', libelle: 'Arrière gauche extérieur', essieu: 'Essieu arrière (traction)', x: 14, y: 70 },
    { code: '4', libelle: 'Arrière gauche intérieur', essieu: 'Essieu arrière (traction)', x: 30, y: 70 },
    { code: '5', libelle: 'Arrière droit intérieur', essieu: 'Essieu arrière (traction)', x: 70, y: 70 },
    { code: '6', libelle: 'Arrière droit extérieur', essieu: 'Essieu arrière (traction)', x: 86, y: 70 },
    { code: '7', libelle: 'Roue de secours', essieu: 'Secours', x: 50, y: 45 },
  ],
  semi_remorque: [
    { code: '1', libelle: 'Essieu 1 gauche', essieu: 'Essieu 1', x: 30, y: 20 },
    { code: '2', libelle: 'Essieu 1 droit', essieu: 'Essieu 1', x: 70, y: 20 },
    { code: '3', libelle: 'Essieu 2 gauche', essieu: 'Essieu 2', x: 30, y: 50 },
    { code: '4', libelle: 'Essieu 2 droit', essieu: 'Essieu 2', x: 70, y: 50 },
    { code: '5', libelle: 'Essieu 3 gauche', essieu: 'Essieu 3', x: 30, y: 80 },
    { code: '6', libelle: 'Essieu 3 droit', essieu: 'Essieu 3', x: 70, y: 80 },
  ],
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
  // Tracteur 4021 TBA : 7 positions
  const tr = [
    ['EP08203T705/017', 16, 8.0], ['EP08172Q810/400', 14, 8.0], ['EP08201Q815/860', 9, 7.5], ['EP08196E810/682', 1.8, 7.8],
    ['EP08163T707/293', 10, 6.5], ['EP08201Q815/861', 11, 8.0], ['EP08203Q814/833', 16, 8.0],
  ] as const
  tr.forEach(([serie, sculpt, press], i) => out.push({
    id: `PN-${String(i + 1).padStart(4, '0')}`, numeroSerie: serie, marque: 'Triangle', taille: '315/80R22,5', profil: 'Pneu traction',
    indiceChargeVitesse: '154/151M', dateFabrication: '3324', neuf: true, fournisseur: 'Pneus Océan Indien', prixAr: 1_450_000, dateAchat: '2025-01-20',
    statut: 'monte', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA', positionCode: String(i + 1), kmVehiculeAuMontage: 152_000, kmCumules: 0,
    kmDerniereRotation: i === 2 ? 152_000 : 171_000, derniereRotationLe: i === 2 ? '2025-01-30' : '2026-06-12', nbRechapages: 0, coutRechapagesAr: 0,
    releves: [{ date: '2026-08-26T08:00:00', pressionBar: press, sculptureMm: sculpt, par: 'Rakoto Andrianina' }],
    historique: [evAchat('2025-01-20', 'Pneus Océan Indien'), { date: '2025-01-30', type: 'montage', detail: `Monté sur 4021 TBA, position ${i + 1}` }],
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
      releves: [{ date: '2026-08-02T08:00:00', pressionBar: 8, sculptureMm: 2, par: 'Rakoto Andrianina' }],
      historique: [evAchat('2024-02-01', 'Pneus Océan Indien'), { date: '2026-08-05', type: 'rechapage', detail: 'Envoyé au rechapage : sculpture à 2 mm, carcasse saine' }] },
    { id: 'PN-0017', numeroSerie: 'DC07733A221/091', marque: 'Double Coin', taille: '315/80R22,5', profil: 'Pneu traction', neuf: false, fournisseur: 'Pneus Océan Indien',
      prixAr: 1_200_000, dateAchat: '2024-02-01', statut: 'rebut', kmCumules: 171_000, nbRechapages: 1, coutRechapagesAr: 390_000, motifRetrait: 'Éclatement, carcasse endommagée',
      releves: [], historique: [evAchat('2024-02-01', 'Pneus Océan Indien'), { date: '2026-06-18', type: 'rebut', detail: 'Mis au rebut : éclatement, carcasse endommagée' }] },
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

  const getById = (id: string) => pneus.value.find(p => p.id === id)
  const kmVehicule = (vehiculeId?: string) => vehicules.liste.find(v => v.id === vehiculeId)?.kilometrage ?? 0
  const planDuVehicule = (vehiculeId: string): PositionPneu[] => {
    const v = vehicules.liste.find(x => x.id === vehiculeId)
    return v ? (PLANS_PNEUS[v.type] ?? []) : []
  }
  const pneusDuVehicule = (vehiculeId: string) => pneus.value.filter(p => p.statut === 'monte' && p.vehiculeId === vehiculeId)

  /** Kilomètres parcourus par le pneu : montages précédents + montage en cours. */
  function kmParcourus(p: Pneu): number {
    const enCours = p.statut === 'monte' ? Math.max(0, kmVehicule(p.vehiculeId) - (p.kmVehiculeAuMontage ?? 0)) : 0
    return p.kmCumules + enCours
  }
  const coutTotal = (p: Pneu) => p.prixAr + p.coutRechapagesAr
  /** Coût au kilomètre : prix et rechapages divisés par les km parcourus. */
  const coutParKm = (p: Pneu): number | null => { const km = kmParcourus(p); return km > 0 ? coutTotal(p) / km : null }
  const dernierReleve = (p: Pneu) => [...p.releves].sort((a, b) => b.date.localeCompare(a.date))[0]

  /** Alertes d'un pneu monté : pression basse, sculpture sous le seuil, rotation due. */
  function alertesDe(p: Pneu): string[] {
    if (p.statut !== 'monte') return []
    const out: string[] = []
    const r = dernierReleve(p)
    if (r && r.pressionBar < seuils.value.pressionMinBar) out.push(`Pression basse (${r.pressionBar} bar)`)
    if (r && r.sculptureMm <= seuils.value.sculptureMinMm) out.push(`Sculpture critique (${r.sculptureMm} mm)`)
    if (rotationDue(p)) out.push('Rotation à prévoir')
    return out
  }
  function rotationDue(p: Pneu): boolean {
    if (p.statut !== 'monte') return false
    const v = vehicules.liste.find(x => x.id === p.vehiculeId)
    if (v?.type === 'tracteur' && p.positionCode === '7') return false // roue de secours
    const kmDepuis = kmVehicule(p.vehiculeId) - (p.kmDerniereRotation ?? p.kmVehiculeAuMontage ?? 0)
    const depuis = p.derniereRotationLe ?? p.historique.find(e => e.type === 'montage')?.date
    const mois = depuis ? (Date.now() - new Date(depuis).getTime()) / (30.44 * 86400000) : 0
    return kmDepuis >= seuils.value.rotationKm || mois >= seuils.value.rotationMois
  }
  const alertes = computed(() => pneus.value.filter(p => alertesDe(p).length).map(p => ({ pneu: p, motifs: alertesDe(p) })))

  /* ── Actions ───────────────────────────────────────────────── */
  function creer(d: Omit<Pneu, 'id' | 'statut' | 'kmCumules' | 'nbRechapages' | 'coutRechapagesAr' | 'releves' | 'historique'>): { ok: boolean; motif?: string; id?: string } {
    if (!d.numeroSerie.trim() || !d.marque.trim() || !d.taille.trim()) return { ok: false, motif: 'Indiquez le numéro de série, la marque et la taille.' }
    if (!(d.prixAr > 0)) return { ok: false, motif: "Indiquez le prix d'achat." }
    if (!d.dateAchat || d.dateAchat > new Date().toISOString().slice(0, 10)) return { ok: false, motif: "La date d'achat est obligatoire et ne peut pas être dans le futur." }
    if (pneus.value.some(p => p.numeroSerie.toLowerCase() === d.numeroSerie.trim().toLowerCase())) return { ok: false, motif: 'Ce numéro de série est déjà enregistré : chaque pneu a un identifiant unique.' }
    const id = `PN-${Date.now().toString(36).toUpperCase()}`
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
      kmDerniereRotation: v.kilometrage, derniereRotationLe: new Date().toISOString() })
    p.historique.push({ date: new Date().toISOString(), type: 'montage', detail: `Monté sur ${v.immatriculation}, ${pos.libelle} (${v.kilometrage.toLocaleString('fr-FR')} km)` })
    return { ok: true }
  }
  /** Démontage : le pneu revient en stock avec ses kilomètres cumulés. */
  function demonter(pneuId: string, motif: string) {
    const p = getById(pneuId); if (!p || p.statut !== 'monte') return
    p.kmCumules = kmParcourus(p)
    p.historique.push({ date: new Date().toISOString(), type: 'demontage', detail: `Démonté de ${p.vehiculePlaque}, position ${p.positionCode}${motif ? ` : ${motif}` : ''}` })
    Object.assign(p, { statut: 'stock', vehiculeId: undefined, vehiculePlaque: undefined, positionCode: undefined, kmVehiculeAuMontage: undefined })
  }
  function relever(pneuId: string, pressionBar: number, sculptureMm: number, par: string): { ok: boolean; motif?: string } {
    const p = getById(pneuId); if (!p) return { ok: false, motif: 'Pneu introuvable.' }
    if (!(pressionBar > 0) || !(sculptureMm >= 0)) return { ok: false, motif: 'Indiquez la pression et la profondeur de sculpture.' }
    if (pressionBar > 15 || sculptureMm > 30) return { ok: false, motif: 'Valeur hors plage : vérifiez la saisie (pression en bar, sculpture en mm).' }
    if (p.statut !== 'monte') return { ok: false, motif: 'Le relevé se fait sur un pneu monté.' }
    p.releves.push({ date: new Date().toISOString(), pressionBar, sculptureMm, par })
    p.historique.push({ date: new Date().toISOString(), type: 'releve', detail: `Relevé : ${pressionBar} bar, ${sculptureMm} mm (${par})` })
    return { ok: true }
  }
  /** Rotation validée par le technicien : le pneu change de position sur le
   *  même véhicule ; s'il y en a un à la position visée, ils s'échangent. */
  function pivoter(pneuId: string, nouvellePosition: string, technicien: string): { ok: boolean; motif?: string } {
    const p = getById(pneuId)
    if (!p || p.statut !== 'monte' || !p.vehiculeId) return { ok: false, motif: 'Seul un pneu monté peut faire l\'objet d\'une rotation.' }
    if (!technicien.trim()) return { ok: false, motif: 'La rotation doit être validée par un technicien.' }
    if (nouvellePosition === p.positionCode) return { ok: false, motif: 'Choisissez une autre position.' }
    const km = kmVehicule(p.vehiculeId); const le = new Date().toISOString()
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
    if (p.statut === 'monte') p.kmCumules = kmParcourus(p)
    const depuis = p.vehiculePlaque ? ` (retiré de ${p.vehiculePlaque}, position ${p.positionCode})` : ''
    Object.assign(p, { statut: destination, motifRetrait: motif.trim(), vehiculeId: undefined, vehiculePlaque: undefined, positionCode: undefined, kmVehiculeAuMontage: undefined })
    p.historique.push({ date: new Date().toISOString(), type: destination, detail: `${destination === 'rechapage' ? 'Envoyé au rechapage' : 'Mis au rebut'} : ${motif.trim()}${depuis}` })
    return { ok: true }
  }
  function retourRechapage(pneuId: string, coutAr: number): { ok: boolean; motif?: string } {
    const p = getById(pneuId); if (!p || p.statut !== 'rechapage') return { ok: false, motif: "Ce pneu n'est pas en rechapage." }
    p.statut = 'stock'; p.neuf = false; p.nbRechapages++; p.coutRechapagesAr += coutAr > 0 ? coutAr : 0
    p.historique.push({ date: new Date().toISOString(), type: 'retour_rechapage', detail: `Retour de rechapage${coutAr > 0 ? ` (${coutAr.toLocaleString('fr-FR')} Ar)` : ''}, remis en stock` })
    return { ok: true }
  }
  return { pneus, seuils, getById, planDuVehicule, pneusDuVehicule, kmParcourus, coutTotal, coutParKm, dernierReleve, alertesDe, rotationDue, alertes,
    creer, monter, demonter, relever, pivoter, retirer, retourRechapage }
})
