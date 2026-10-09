import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useCarburantStore } from './carburant'
import { useVehiculeStore } from './vehicules'
import { usePersonnelStore } from './personnel'
import { usePrestatairesStore } from './prestataires'

/**
 * Cartes carburant et transactions du prestataire (FMS-CA-02). Une carte est
 * rattachée à un véhicule ou à un chauffeur et porte ses limites. Les
 * transactions importées se rapprochent des pleins enregistrés ; celles qui
 * ne trouvent pas de plein, ou qui dépassent une limite, sont signalées.
 */
export type RattachementCarte = 'vehicule' | 'chauffeur'
export type StatutCarte = 'active' | 'bloquee'
export interface LimitesCarte {
  montantMensuelAr?: number
  volumeMensuelL?: number
  transactionsParJour?: number
  /** Villes où la carte peut être utilisée ; vide : partout. */
  zones: string[]
  heureDebut?: number
  heureFin?: number
}
export interface CarteCarburant {
  id: string
  numero: string
  fournisseurId: string
  rattachement: RattachementCarte
  vehiculeId?: string
  chauffeurId?: string
  limites: LimitesCarte
  statut: StatutCarte
  dateExpiration: string
  motifBlocage?: string
  historique: { le: string; par: string; action: string }[]
}
export interface TransactionCarte {
  id: string
  carteId: string
  date: string
  station: string
  ville: string
  litres: number
  montantAr: number
  rechargeId?: string
  /** Rapprochement fait à la main plutôt qu'automatiquement. */
  rapprochementManuel?: boolean
  importeLe: string
}

export const LIB_RATTACHEMENT: Record<RattachementCarte, string> = { vehicule: 'Véhicule', chauffeur: 'Chauffeur' }

const CLE_CARTES = 'fms-ucodis-cartes-carburant'
const CLE_TX = 'fms-ucodis-transactions-cartes'
function lire<T>(cle: string): T | null { try { const b = localStorage.getItem(cle); return b ? JSON.parse(b) as T : null } catch { return null } }
function ecrire(cle: string, v: unknown) { try { localStorage.setItem(cle, JSON.stringify(v)) } catch { /* stockage indisponible */ } }

const LIMITES_STD: LimitesCarte = { montantMensuelAr: 12_000_000, volumeMensuelL: 2_000, transactionsParJour: 3, zones: [], heureDebut: 4, heureFin: 21 }
const SEED_CARTES: CarteCarburant[] = [
  { id: 'CC-0001', numero: '7089 1200 0001 4021', fournisseurId: 'PRS-007', rattachement: 'vehicule', vehiculeId: 'v-tr-1', limites: { ...LIMITES_STD }, statut: 'active', dateExpiration: '2027-06-30', historique: [] },
  { id: 'CC-0002', numero: '7089 1200 0002 4022', fournisseurId: 'PRS-007', rattachement: 'vehicule', vehiculeId: 'v-tr-2', limites: { ...LIMITES_STD, zones: ['Antananarivo', 'Mahajanga', 'Toamasina'] }, statut: 'active', dateExpiration: '2027-06-30', historique: [] },
  { id: 'CC-0003', numero: '7089 1200 0003 4024', fournisseurId: 'PRS-007', rattachement: 'vehicule', vehiculeId: 'v-tr-4', limites: { ...LIMITES_STD }, statut: 'active', dateExpiration: '2027-06-30', historique: [] },
  { id: 'CC-0004', numero: '6120 8800 0004 0015', fournisseurId: 'PRS-008', rattachement: 'chauffeur', chauffeurId: 'p-015', limites: { ...LIMITES_STD, montantMensuelAr: 8_000_000, volumeMensuelL: 1_400 }, statut: 'active', dateExpiration: '2027-03-31', historique: [] },
  { id: 'CC-0005', numero: '7089 1200 0005 4029', fournisseurId: 'PRS-007', rattachement: 'vehicule', vehiculeId: 'v-tr-9', limites: { ...LIMITES_STD }, statut: 'bloquee', motifBlocage: 'Véhicule hors service après accident', dateExpiration: '2027-06-30', historique: [{ le: '2026-08-29T12:00:00', par: 'Hery Andriamalala', action: 'Carte bloquée : véhicule hors service après accident' }] },
]
const SEED_TX: TransactionCarte[] = [
  { id: 'TX-0001', carteId: 'CC-0001', date: '2026-08-24T14:35:00', station: 'Station Toamasina', ville: 'Toamasina', litres: 140, montantAr: 791_000, importeLe: '2026-08-31T09:00:00' },
  { id: 'TX-0002', carteId: 'CC-0002', date: '2026-08-20T18:12:00', station: 'Station Mahajanga', ville: 'Mahajanga', litres: 545, montantAr: 3_106_500, importeLe: '2026-08-31T09:00:00' },
  { id: 'TX-0003', carteId: 'CC-0003', date: '2026-08-26T13:07:00', station: 'Station Toamasina', ville: 'Toamasina', litres: 132, montantAr: 752_400, importeLe: '2026-08-31T09:00:00' },
  { id: 'TX-0004', carteId: 'CC-0004', date: '2026-08-18T18:16:00', station: 'Station Toamasina', ville: 'Toamasina', litres: 165, montantAr: 940_500, importeLe: '2026-08-31T09:00:00' },
  { id: 'TX-0005', carteId: 'CC-0001', date: '2026-08-27T22:40:00', station: 'Station Antsirabe', ville: 'Antsirabe', litres: 120, montantAr: 678_000, importeLe: '2026-08-31T09:00:00' },
  { id: 'TX-0006', carteId: 'CC-0002', date: '2026-08-28T10:05:00', station: 'Station Fianarantsoa', ville: 'Fianarantsoa', litres: 90, montantAr: 508_500, importeLe: '2026-08-31T09:00:00' },
]

export const useCartesCarburantStore = defineStore('cartesCarburant', () => {
  const carburant = useCarburantStore()
  const vehicules = useVehiculeStore()
  const personnel = usePersonnelStore()
  const prestataires = usePrestatairesStore()

  const cartes = ref<CarteCarburant[]>(lire<CarteCarburant[]>(CLE_CARTES) ?? SEED_CARTES.map(c => ({ ...c, limites: { ...c.limites, zones: [...c.limites.zones] }, historique: [...c.historique] })))
  const transactions = ref<TransactionCarte[]>(lire<TransactionCarte[]>(CLE_TX) ?? SEED_TX.map(t => ({ ...t })))
  watch(cartes, v => ecrire(CLE_CARTES, v), { deep: true })
  watch(transactions, v => ecrire(CLE_TX, v), { deep: true })

  const getById = (id?: string) => cartes.value.find(c => c.id === id)
  const transactionParId = (id?: string) => transactions.value.find(t => t.id === id)
  const transactionsDe = (carteId: string) => transactions.value.filter(t => t.carteId === carteId).sort((a, b) => +new Date(b.date) - +new Date(a.date))

  function titulaire(c: CarteCarburant) {
    if (c.rattachement === 'vehicule') return vehicules.parId(c.vehiculeId ?? '')?.immatriculation ?? 'Véhicule inconnu'
    return personnel.liste.find(p => p.id === c.chauffeurId)?.nomComplet ?? 'Chauffeur inconnu'
  }
  const fournisseur = (c: CarteCarburant) => prestataires.getById(c.fournisseurId)?.nom ?? '-'

  /* ── Contrôle des limites ─────────────────────────────────── */
  const moisDe = (iso: string) => iso.slice(0, 7)
  function depassements(t: TransactionCarte): string[] {
    const c = getById(t.carteId); if (!c) return ['Carte inconnue']
    const out: string[] = []
    if (t.date.slice(0, 10) > c.dateExpiration) out.push('Carte expirée à cette date')
    const blocage = c.historique.filter(h => h.action.startsWith('Carte bloquée')).map(h => h.le).sort().pop()
    if (c.statut === 'bloquee' && blocage && t.date >= blocage) out.push('Carte bloquée à cette date')
    const L = c.limites
    if (L.zones.length && !L.zones.some(z => z.toLowerCase() === t.ville.trim().toLowerCase())) out.push(`Hors zone autorisée (${t.ville})`)
    const h = new Date(t.date).getHours()
    if (L.heureDebut != null && L.heureFin != null && (h < L.heureDebut || h > L.heureFin)) out.push(`Hors horaire autorisé (${String(h).padStart(2, '0')} h)`)
    const memeJour = transactions.value.filter(x => x.carteId === c.id && x.date.slice(0, 10) === t.date.slice(0, 10) && x.date <= t.date)
    if (L.transactionsParJour && memeJour.length > L.transactionsParJour) out.push(`Plus de ${L.transactionsParJour} transaction(s) dans la journée`)
    const memeMois = transactions.value.filter(x => x.carteId === c.id && moisDe(x.date) === moisDe(t.date) && x.date <= t.date)
    if (L.montantMensuelAr && memeMois.reduce((s, x) => s + x.montantAr, 0) > L.montantMensuelAr) out.push('Plafond mensuel en montant dépassé')
    if (L.volumeMensuelL && memeMois.reduce((s, x) => s + x.litres, 0) > L.volumeMensuelL) out.push('Plafond mensuel en volume dépassé')
    return out
  }

  /** Taux d'utilisation sur le dernier mois d'activité de la carte. */
  function utilisation(c: CarteCarburant): { mois: string | null; montant: number; litres: number; tauxPct: number | null } {
    const tx = transactionsDe(c.id)
    const mois = tx[0] ? moisDe(tx[0].date) : null
    const duMois = mois ? tx.filter(t => moisDe(t.date) === mois) : []
    const montant = duMois.reduce((s, t) => s + t.montantAr, 0)
    const litres = duMois.reduce((s, t) => s + t.litres, 0)
    const tauxPct = c.limites.montantMensuelAr ? Math.round((montant / c.limites.montantMensuelAr) * 100) : null
    return { mois, montant, litres, tauxPct }
  }

  /* ── Rapprochement avec les pleins ────────────────────────── */
  function candidats(t: TransactionCarte) {
    const c = getById(t.carteId); if (!c) return []
    const p = carburant.parametres
    const dejaLies = new Set(transactions.value.filter(x => x.rechargeId && x.id !== t.id).map(x => x.rechargeId))
    return carburant.recharges.filter(r => {
      if (dejaLies.has(r.id)) return false
      if (c.rattachement === 'vehicule' ? r.vehiculeId !== c.vehiculeId : r.chauffeurId !== c.chauffeurId) return false
      const ecartMin = Math.abs(new Date(r.date).getTime() - new Date(t.date).getTime()) / 60_000
      const ecartPct = Math.abs(r.litres - t.litres) / t.litres * 100
      return ecartMin <= p.toleranceRapprochementMin && ecartPct <= p.toleranceRapprochementPct
    })
  }
  function rapprocherTout() {
    let n = 0
    transactions.value.filter(t => !t.rechargeId).forEach(t => {
      const r = candidats(t)[0]
      if (r) { t.rechargeId = r.id; carburant.lierTransaction(r.id, t.id); n++ }
    })
    return n
  }
  rapprocherTout()

  /** Rapprochement manuel : la transaction et le plein doivent concerner le même titulaire. */
  function rapprocher(transactionId: string, rechargeId: string): { ok: boolean; motif?: string } {
    const t = transactionParId(transactionId); const r = carburant.getById(rechargeId); const c = t ? getById(t.carteId) : undefined
    if (!t || !r || !c) return { ok: false, motif: 'Transaction ou plein introuvable.' }
    if (transactions.value.some(x => x.rechargeId === rechargeId && x.id !== transactionId)) return { ok: false, motif: 'Ce plein est déjà rapproché d’une autre transaction.' }
    if (c.rattachement === 'vehicule' ? r.vehiculeId !== c.vehiculeId : r.chauffeurId !== c.chauffeurId)
      return { ok: false, motif: `Ce plein ne concerne pas le titulaire de la carte (${titulaire(c)}).` }
    if (t.rechargeId) carburant.lierTransaction(t.rechargeId, undefined)
    t.rechargeId = r.id; t.rapprochementManuel = true; carburant.lierTransaction(r.id, t.id)
    return { ok: true }
  }
  function annulerRapprochement(transactionId: string) {
    const t = transactionParId(transactionId); if (!t?.rechargeId) return
    carburant.lierTransaction(t.rechargeId, undefined); t.rechargeId = undefined; t.rapprochementManuel = undefined
  }

  /* ── Import des transactions du prestataire ───────────────── */
  function carteParNumero(numero: string) {
    const n = numero.replace(/\s/g, '')
    return cartes.value.find(c => c.numero.replace(/\s/g, '') === n)
  }
  function estDoublon(carteId: string, date: string, litres: number) {
    return transactions.value.some(t => t.carteId === carteId && t.date.slice(0, 16) === date.slice(0, 16) && t.litres === litres)
  }
  function importer(lignes: Omit<TransactionCarte, 'id' | 'importeLe'>[]) {
    const nouvelles = lignes.filter(l => !estDoublon(l.carteId, l.date, l.litres))
    let seq = transactions.value.length + 1
    nouvelles.forEach(l => {
      while (transactions.value.some(t => t.id === `TX-${String(seq).padStart(4, '0')}`)) seq++
      transactions.value.push({ ...l, id: `TX-${String(seq++).padStart(4, '0')}`, importeLe: new Date().toISOString() })
    })
    const rapprochees = rapprocherTout()
    return { importees: nouvelles.length, ignorees: lignes.length - nouvelles.length, rapprochees }
  }

  /* ── Gestion des cartes ───────────────────────────────────── */
  function verifier(c: Omit<CarteCarburant, 'id' | 'historique' | 'statut'>, idExclu?: string): string | null {
    if (!c.numero.trim()) return 'Indiquez le numéro de la carte.'
    if (cartes.value.some(x => x.id !== idExclu && x.numero.replace(/\s/g, '') === c.numero.replace(/\s/g, ''))) return 'Ce numéro de carte est déjà enregistré.'
    if (!c.fournisseurId) return 'Choisissez le fournisseur.'
    if (c.rattachement === 'vehicule' && !c.vehiculeId) return 'Choisissez le véhicule rattaché.'
    if (c.rattachement === 'chauffeur' && !c.chauffeurId) return 'Choisissez le chauffeur rattaché.'
    if (!c.dateExpiration) return "Indiquez la date d'expiration."
    const L = c.limites
    if ([L.montantMensuelAr, L.volumeMensuelL, L.transactionsParJour].some(x => x != null && x < 0)) return 'Une limite ne peut pas être négative.'
    if ((L.heureDebut == null) !== (L.heureFin == null)) return "Indiquez les deux bornes de l'horaire, ou aucune."
    if (L.heureDebut != null && L.heureFin != null && (L.heureDebut < 0 || L.heureFin > 23 || L.heureDebut >= L.heureFin)) return "L'horaire autorisé est incohérent."
    const doublonActif = cartes.value.find(x => x.id !== idExclu && x.statut === 'active' && x.rattachement === c.rattachement
      && (c.rattachement === 'vehicule' ? x.vehiculeId === c.vehiculeId : x.chauffeurId === c.chauffeurId) && x.fournisseurId === c.fournisseurId)
    if (doublonActif) return `Une carte active de ce fournisseur est déjà rattachée à ce titulaire (${doublonActif.numero}).`
    return null
  }
  function creer(c: Omit<CarteCarburant, 'id' | 'historique' | 'statut'>, par: string): { ok: boolean; id?: string; motif?: string } {
    const motif = verifier(c); if (motif) return { ok: false, motif }
    let seq = cartes.value.length + 1
    while (cartes.value.some(x => x.id === `CC-${String(seq).padStart(4, '0')}`)) seq++
    const id = `CC-${String(seq).padStart(4, '0')}`
    cartes.value.push({ ...c, numero: c.numero.trim(), id, statut: 'active', historique: [{ le: new Date().toISOString(), par, action: 'Carte enregistrée' }] })
    return { ok: true, id }
  }
  function modifierLimites(id: string, limites: LimitesCarte, par: string): { ok: boolean; motif?: string } {
    const c = getById(id); if (!c) return { ok: false, motif: 'Carte introuvable.' }
    const motif = verifier({ ...c, limites }, id); if (motif) return { ok: false, motif }
    c.limites = { ...limites, zones: [...limites.zones] }
    c.historique.push({ le: new Date().toISOString(), par, action: 'Limites modifiées' })
    return { ok: true }
  }
  function bloquer(id: string, motif: string, par: string): { ok: boolean; motif?: string } {
    const c = getById(id); if (!c) return { ok: false, motif: 'Carte introuvable.' }
    if (!motif.trim()) return { ok: false, motif: 'Indiquez le motif du blocage.' }
    c.statut = 'bloquee'; c.motifBlocage = motif.trim()
    c.historique.push({ le: new Date().toISOString(), par, action: `Carte bloquée : ${motif.trim()}` })
    return { ok: true }
  }
  function debloquer(id: string, par: string): { ok: boolean; motif?: string } {
    const c = getById(id); if (!c) return { ok: false, motif: 'Carte introuvable.' }
    if (c.dateExpiration < new Date().toISOString().slice(0, 10)) return { ok: false, motif: 'Carte expirée : enregistrez la nouvelle carte.' }
    const motif = verifier(c, id); if (motif) return { ok: false, motif }
    c.statut = 'active'; c.motifBlocage = undefined
    c.historique.push({ le: new Date().toISOString(), par, action: 'Carte débloquée' })
    return { ok: true }
  }

  const nonRapprochees = computed(() => transactions.value.filter(t => !t.rechargeId))
  const enDepassement = computed(() => transactions.value.filter(t => depassements(t).length))

  return {
    cartes, transactions, getById, transactionParId, transactionsDe, titulaire, fournisseur,
    depassements, utilisation, candidats, rapprocherTout, rapprocher, annulerRapprochement,
    carteParNumero, estDoublon, importer, creer, modifierLimites, bloquer, debloquer,
    nonRapprochees, enDepassement,
  }
})
