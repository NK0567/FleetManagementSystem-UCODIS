import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { RechargeCarburant, ControleVraisemblance, PeriodeConso, QualifEcartCarburant, CanalRecharge } from '../types'
import { useVehiculeStore } from './vehicules'
import { useVoyagesStore } from './voyages'

export const LIB_CANAL: Record<CanalRecharge, string> = {
  manuelle: 'Saisie au bureau', mobile: 'Saisie mobile', import: 'Import fichier', carte: 'Carte carburant', regularisation: 'Régularisation',
}
export const LIB_QUALIF: Record<QualifEcartCarburant, string> = {
  technique: 'Cause technique', conduite: 'Comportement de conduite',
  prelevement: 'Prélèvement suspecté', saisie: 'Erreur de saisie',
}
/** Causes imputables au chauffeur : seules elles ouvrent une proposition de retenue. */
export const QUALIFS_IMPUTABLES: QualifEcartCarburant[] = ['conduite', 'prelevement']

export interface ReferenceVehicule { vehiculeId: string; trajetId: string; refL100: number }
export interface ParametresCarburant {
  heureDebut: number
  heureFin: number
  ecartGpsMaxKm: number
  seuilEcartConsoPct: number
  facteurCo2KgParL: number
  refDefautL100: number
  refsCorridor: Record<string, number>
  refsVehicule: ReferenceVehicule[]
  toleranceRapprochementMin: number
  toleranceRapprochementPct: number
}
/** Valeurs de départ, toutes réglables dans Configuration, onglet Carburant. */
export const PARAMETRES_CARBURANT_DEFAUT: ParametresCarburant = {
  heureDebut: 4, heureFin: 20, ecartGpsMaxKm: 2, seuilEcartConsoPct: 8, facteurCo2KgParL: 2.68,
  refDefautL100: 37, refsCorridor: { 'TRJ-001': 36, 'TRJ-002': 32, 'TRJ-003': 39 }, refsVehicule: [],
  toleranceRapprochementMin: 120, toleranceRapprochementPct: 2,
}

export type StatutEcartConso = 'conforme' | 'a_qualifier' | 'qualifie' | 'en_validation' | 'refacture' | 'classe'
export const LIB_STATUT_ECART: Record<StatutEcartConso, { label: string; cls: string }> = {
  conforme: { label: 'Dans la référence', cls: 'bg-success-bg text-success' },
  a_qualifier: { label: 'À qualifier', cls: 'bg-warning-bg text-warning' },
  qualifie: { label: 'Qualifié', cls: 'bg-info-bg text-info' },
  en_validation: { label: 'Retenue en validation', cls: 'bg-warning-bg text-warning' },
  refacture: { label: 'Retenue validée', cls: 'bg-danger-bg text-danger' },
  classe: { label: 'Classé sans suite', cls: 'bg-neutral-bg text-neutral' },
}
export interface DossierEcartConso {
  statut: Exclude<StatutEcartConso, 'conforme' | 'a_qualifier'>
  qualification: QualifEcartCarburant
  commentaire?: string
  qualifiePar: string
  qualifieLe: string
  montantPropose?: number
  proposePar?: string
  validation?: { valideur: string; decision: 'approuve' | 'rejete'; date: string; commentaire?: string }
}

const CLE_RECHARGES = 'fms-ucodis-recharges'
const CLE_PARAMS = 'fms-ucodis-parametres-carburant'
const CLE_ECARTS = 'fms-ucodis-ecarts-conso-v2'
function lire<T>(cle: string): T | null { try { const b = localStorage.getItem(cle); return b ? JSON.parse(b) as T : null } catch { return null } }
function ecrire(cle: string, v: unknown) { try { localStorage.setItem(cle, JSON.stringify(v)) } catch { /* stockage plein ou indisponible */ } }

/**
 * Store carburant · méthode plein-à-plein : les litres délivrés sont une
 * donnée exacte relevée à chaque plein ; la consommation aux 100 km ne se
 * calcule qu'entre deux pleins complets, seule méthode fiable sans capteur
 * de niveau. Contrôles automatiques (FMS-CA-03) : réservoir, kilométrage,
 * chauffeur réellement affecté, plage horaire, et position GPS quand elle
 * est connue. Un plein suspect est « à qualifier », sans présumer de sa cause.
 */
  const SEED: RechargeCarburant[] = [
    { id: 'RCH-001', date: '2026-08-24T05:20:00', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA',
      chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga', voyageId: 'VOY-001', voyageRef: 'VOY-2026-0148',
      litres: 480, prixLitre: 5400, montant: 2_592_000, odometre: 182_100, pleinComplet: true,
      lieu: 'Dépôt UCODIS Tanjombato', lat: -18.8792, lng: 47.5079,
      positionVehicule: { lat: -18.8802, lng: 47.5091, ecartKm: 0.15 },
      canal: 'mobile', controles: [], statut: 'valide' },
    { id: 'RCH-002', date: '2026-08-24T14:32:00', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA',
      chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga', voyageId: 'VOY-001', voyageRef: 'VOY-2026-0148',
      litres: 140, prixLitre: 5650, montant: 791_000, odometre: 182_478, pleinComplet: true,
      lieu: 'Station Toamasina', lat: -18.1492, lng: 49.4023, canal: 'import', controles: [], statut: 'valide' },
    { id: 'RCH-003', date: '2026-08-20T04:50:00', vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA',
      chauffeurId: 'p-011', chauffeurNom: 'Mamy Andrianaivo', voyageId: 'VOY-003', voyageRef: 'VOY-2026-0147',
      litres: 490, prixLitre: 5400, montant: 2_646_000, odometre: 165_780, pleinComplet: true,
      lieu: 'Dépôt UCODIS Tanjombato', lat: -18.8792, lng: 47.5079, canal: 'mobile', controles: [], statut: 'valide' },
    { id: 'RCH-004', date: '2026-08-20T18:10:00', vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA',
      chauffeurId: 'p-011', chauffeurNom: 'Mamy Andrianaivo', voyageId: 'VOY-003', voyageRef: 'VOY-2026-0147',
      litres: 545, prixLitre: 5700, montant: 3_106_500, odometre: 166_352, pleinComplet: true,
      lieu: 'Station Mahajanga', lat: -15.7167, lng: 46.3167,
      positionVehicule: { lat: -15.6980, lng: 46.2850, ecartKm: 4.2 },
      canal: 'import', controles: [], statut: 'anomalie' }, // 545 L > réservoir 500 L, position hors zone
    { id: 'RCH-005', date: '2026-08-26T05:55:00', vehiculeId: 'v-tr-4', vehiculePlaque: '4024 TBA',
      chauffeurId: 'p-013', chauffeurNom: 'Jaona Ratsimbazafy', voyageId: 'VOY-005', voyageRef: 'VOY-2026-0146',
      litres: 470, prixLitre: 5400, montant: 2_538_000, odometre: 120_100, pleinComplet: true,
      lieu: 'Dépôt UCODIS Tanjombato', lat: -18.8792, lng: 47.5079, canal: 'mobile', controles: [], statut: 'valide' },
    { id: 'RCH-006', date: '2026-08-26T13:05:00', vehiculeId: 'v-tr-4', vehiculePlaque: '4024 TBA',
      chauffeurId: 'p-013', chauffeurNom: 'Jaona Ratsimbazafy', voyageId: 'VOY-005', voyageRef: 'VOY-2026-0146',
      litres: 132, prixLitre: 5700, montant: 752_400, odometre: 120_461, pleinComplet: true,
      lieu: 'Station Toamasina', lat: -18.1492, lng: 49.4023, canal: 'import', controles: [], statut: 'valide' },
    { id: 'RCH-007', date: '2026-09-03T02:30:00', vehiculeId: 'v-tr-3', vehiculePlaque: '4023 TBA',
      chauffeurId: 'p-012', chauffeurNom: 'Tiana Rasolofoson', voyageId: 'VOY-002', voyageRef: 'VOY-2026-0149',
      litres: 460, prixLitre: 5400, montant: 2_484_000, odometre: 98_450, pleinComplet: true,
      lieu: 'Dépôt UCODIS Tanjombato', lat: -18.8792, lng: 47.5079, canal: 'mobile', controles: [], statut: 'anomalie' }, // 02h30, hors plage
    { id: 'RCH-008', date: '2026-08-10T05:50:00', vehiculeId: 'v-tr-5', vehiculePlaque: '4025 TBA',
      chauffeurId: 'p-014', chauffeurNom: 'Fenohery Randriamampionona', voyageId: 'VOY-006', voyageRef: 'VOY-2026-0145',
      litres: 350, prixLitre: 5400, montant: 1_890_000, odometre: 243_400, pleinComplet: true,
      lieu: 'Dépôt UCODIS Tanjombato', lat: -18.8792, lng: 47.5079, canal: 'mobile', controles: [], statut: 'valide' },
    { id: 'RCH-009', date: '2026-08-10T09:30:00', vehiculeId: 'v-tr-5', vehiculePlaque: '4025 TBA',
      chauffeurId: 'p-014', chauffeurNom: 'Fenohery Randriamampionona', voyageId: 'VOY-006', voyageRef: 'VOY-2026-0145',
      litres: 55, prixLitre: 5650, montant: 310_750, odometre: 243_568, pleinComplet: true,
      lieu: 'Station Antsirabe', lat: -19.8667, lng: 47.0333, canal: 'import', controles: [], statut: 'valide' },
    { id: 'RCH-010', date: '2026-08-18T05:35:00', vehiculeId: 'v-tr-6', vehiculePlaque: '4026 TBA',
      chauffeurId: 'p-015', chauffeurNom: 'Herizo Rakotondrabe', voyageId: 'VOY-007', voyageRef: 'VOY-2026-0144',
      litres: 470, prixLitre: 5400, montant: 2_538_000, odometre: 176_100, pleinComplet: true,
      lieu: 'Dépôt UCODIS Tanjombato', lat: -18.8792, lng: 47.5079, canal: 'mobile', controles: [], statut: 'valide' },
    { id: 'RCH-011', date: '2026-08-18T18:15:00', vehiculeId: 'v-tr-6', vehiculePlaque: '4026 TBA',
      chauffeurId: 'p-015', chauffeurNom: 'Herizo Rakotondrabe', voyageId: 'VOY-007', voyageRef: 'VOY-2026-0144',
      litres: 165, prixLitre: 5700, montant: 940_500, odometre: 176_452, pleinComplet: true,
      lieu: 'Station Toamasina', lat: -18.1492, lng: 49.4023, canal: 'import', controles: [], statut: 'valide' },
    { id: 'RCH-012', date: '2026-09-08T05:25:00', vehiculeId: 'v-tr-7', vehiculePlaque: '4027 TBA',
      chauffeurId: 'p-016', chauffeurNom: 'Nomena Andriantsoa', voyageId: 'VOY-008', voyageRef: 'VOY-2026-0143',
      litres: 380, prixLitre: 5400, montant: 2_052_000, odometre: 54_100, pleinComplet: true,
      lieu: 'Dépôt UCODIS Tanjombato', lat: -18.8792, lng: 47.5079, canal: 'mobile', controles: [], statut: 'valide' },
    { id: 'RCH-013', date: '2026-08-05T06:05:00', vehiculeId: 'v-tr-8', vehiculePlaque: '4028 TBA',
      chauffeurId: 'p-017', chauffeurNom: 'Tsiory Rabearison', voyageId: 'VOY-009', voyageRef: 'VOY-2026-0142',
      litres: 340, prixLitre: 5400, montant: 1_836_000, odometre: 132_500, pleinComplet: true,
      lieu: 'Dépôt UCODIS Tanjombato', lat: -18.8792, lng: 47.5079, canal: 'mobile', controles: [], statut: 'valide' },
    { id: 'RCH-014', date: '2026-08-05T09:40:00', vehiculeId: 'v-tr-8', vehiculePlaque: '4028 TBA',
      chauffeurId: 'p-017', chauffeurNom: 'Tsiory Rabearison', voyageId: 'VOY-009', voyageRef: 'VOY-2026-0142',
      litres: 50, prixLitre: 5650, montant: 282_500, odometre: 132_668, pleinComplet: true,
      lieu: 'Station Antsirabe', lat: -19.8667, lng: 47.0333, canal: 'import', controles: [], statut: 'valide' },
    { id: 'RCH-015', date: '2026-07-28T05:50:00', vehiculeId: 'v-tr-9', vehiculePlaque: '4029 TBA',
      chauffeurId: 'p-018', chauffeurNom: 'Jean-Luc Razanamalala', voyageId: 'VOY-010', voyageRef: 'VOY-2026-0141',
      litres: 390, prixLitre: 5400, montant: 2_106_000, odometre: 288_700, pleinComplet: true,
      lieu: 'Dépôt UCODIS Tanjombato', lat: -18.8792, lng: 47.5079, canal: 'mobile', controles: [], statut: 'valide' },
    { id: 'RCH-016', date: '2026-07-28T18:30:00', vehiculeId: 'v-tr-9', vehiculePlaque: '4029 TBA',
      chauffeurId: 'p-018', chauffeurNom: 'Jean-Luc Razanamalala', voyageId: 'VOY-010', voyageRef: 'VOY-2026-0141',
      litres: 131, prixLitre: 5700, montant: 746_700, odometre: 289_052, pleinComplet: true,
      lieu: 'Station Toamasina', lat: -18.1492, lng: 49.4023, canal: 'import', controles: [], statut: 'valide' },
    { id: 'RCH-017', date: '2026-08-22T05:20:00', vehiculeId: 'v-tr-10', vehiculePlaque: '4030 TBA',
      chauffeurId: 'p-019', chauffeurNom: 'Fanomezantsoa Rakotonirina', voyageId: 'VOY-011', voyageRef: 'VOY-2026-0140',
      litres: 420, prixLitre: 5400, montant: 2_268_000, odometre: 112_000, pleinComplet: true,
      lieu: 'Dépôt UCODIS Tanjombato', lat: -18.8792, lng: 47.5079, canal: 'mobile', controles: [], statut: 'valide' },
    { id: 'RCH-018', date: '2026-08-22T18:00:00', vehiculeId: 'v-tr-10', vehiculePlaque: '4030 TBA',
      chauffeurId: 'p-019', chauffeurNom: 'Fanomezantsoa Rakotonirina', voyageId: 'VOY-011', voyageRef: 'VOY-2026-0140',
      litres: 218, prixLitre: 5700, montant: 1_242_600, odometre: 112_570, pleinComplet: true,
      lieu: 'Station Mahajanga', lat: -15.7167, lng: 46.3167, canal: 'import', controles: [], statut: 'valide' },
  ]
export const useCarburantStore = defineStore('carburant', () => {
  const vehicules = useVehiculeStore()
  const voyages = useVoyagesStore()

  const recharges = ref<RechargeCarburant[]>(lire<RechargeCarburant[]>(CLE_RECHARGES) ?? SEED.map(r => ({ ...r })))
  const parametres = ref<ParametresCarburant>({ ...PARAMETRES_CARBURANT_DEFAUT, refsCorridor: { ...PARAMETRES_CARBURANT_DEFAUT.refsCorridor }, refsVehicule: [], ...(lire<Partial<ParametresCarburant>>(CLE_PARAMS) ?? {}) })
  const dossiersEcart = ref<Record<string, DossierEcartConso>>(lire<Record<string, DossierEcartConso>>(CLE_ECARTS) ?? {})

  function evaluerControles(r: RechargeCarburant): ControleVraisemblance[] {
    const out: ControleVraisemblance[] = []
    const p = parametres.value
    const capacite = vehicules.parId(r.vehiculeId)?.capaciteReservoirL

    out.push({
      code: 'volume_sup_reservoir', libelle: 'Volume délivré compatible avec la capacité du réservoir',
      ok: capacite == null || r.litres <= capacite,
      detail: capacite == null ? 'Capacité du réservoir non renseignée pour ce véhicule' : `${r.litres} L délivrés, réservoir ${capacite} L`,
    })

    const precedente = recharges.value
      .filter(x => x.id !== r.id && x.vehiculeId === r.vehiculeId && new Date(x.date) < new Date(r.date))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))[0]
    out.push({
      code: 'odometre_incoherent', libelle: 'Kilométrage cohérent avec le plein précédent',
      ok: !precedente || r.odometre > precedente.odometre,
      detail: precedente ? `${precedente.odometre.toLocaleString('fr-FR')} → ${r.odometre.toLocaleString('fr-FR')} km` : 'Premier plein enregistré pour ce véhicule',
    })

    // Affectation effective : l'affectation en vigueur ce jour-là, ou le
    // voyage rattaché qui confie ce véhicule à ce chauffeur.
    let okChauffeur = false
    let detailChauffeur = 'Aucun chauffeur rattaché au plein'
    if (r.chauffeurId) {
      const affecte = vehicules.conducteurAffecteLe(r.vehiculeId, r.date)
      const voy = r.voyageId ? voyages.voyages.find(v => v.id === r.voyageId) : undefined
      const parVoyage = !!voy && voy.vehiculeId === r.vehiculeId && voy.chauffeurId === r.chauffeurId
      okChauffeur = affecte === r.chauffeurId || parVoyage
      detailChauffeur = okChauffeur
        ? `${r.chauffeurNom ?? r.chauffeurId}, ${parVoyage ? `affecté par le voyage ${voy!.reference}` : 'affecté au véhicule à cette date'}`
        : `${r.chauffeurNom ?? r.chauffeurId} n'était ni affecté à ce véhicule ce jour-là ni chauffeur d'un voyage qui l'utilise`
    }
    out.push({ code: 'chauffeur_non_affecte', libelle: 'Chauffeur affecté au véhicule à cette date', ok: okChauffeur, detail: detailChauffeur })

    const h = new Date(r.date).getHours()
    out.push({
      code: 'hors_plage', libelle: `Plein dans la plage horaire habituelle (${String(p.heureDebut).padStart(2, '0')} h à ${String(p.heureFin).padStart(2, '0')} h)`,
      ok: h >= p.heureDebut && h <= p.heureFin, detail: `${String(h).padStart(2, '0')} h`,
    })

    if (r.positionVehicule) {
      out.push({
        code: 'position_gps', libelle: `Position GPS du camion à moins de ${p.ecartGpsMaxKm} km du lieu déclaré`,
        ok: r.positionVehicule.ecartKm <= p.ecartGpsMaxKm, detail: `${r.positionVehicule.ecartKm.toFixed(1)} km entre la position du camion et ${r.lieu}`,
      })
    }
    return out
  }

  function rafraichirControles() {
    recharges.value.forEach(r => {
      r.controles = evaluerControles(r)
      const ko = r.controles.some(c => !c.ok)
      if (r.statut === 'valide' || r.statut === 'anomalie') r.statut = ko ? 'anomalie' : 'valide'
    })
  }
  rafraichirControles()
  watch(parametres, () => { ecrire(CLE_PARAMS, parametres.value); rafraichirControles() }, { deep: true })
  watch(() => vehicules.liste.map(v => v.capaciteReservoirL), rafraichirControles)
  watch(recharges, v => ecrire(CLE_RECHARGES, v), { deep: true })
  watch(dossiersEcart, v => ecrire(CLE_ECARTS, v), { deep: true })

  const getById = (id: string) => recharges.value.find(r => r.id === id)
  let prochainNumero = recharges.value.length + 1

  /** Enregistre un plein après contrôle de la saisie ; un doublon (même
   *  véhicule, même volume à moins de dix minutes) est refusé. */
  function creer(saisie: Omit<RechargeCarburant, 'id' | 'controles' | 'statut'>): { ok: boolean; id?: string; motif?: string } {
    if (!saisie.vehiculeId) return { ok: false, motif: 'Choisissez le véhicule.' }
    if (!(saisie.litres > 0)) return { ok: false, motif: 'Le volume doit être supérieur à zéro.' }
    if (!(saisie.odometre > 0)) return { ok: false, motif: 'Indiquez le kilométrage au compteur.' }
    if (saisie.montant < 0 || saisie.prixLitre < 0) return { ok: false, motif: 'Le montant ne peut pas être négatif.' }
    const t = new Date(saisie.date).getTime()
    if (isNaN(t)) return { ok: false, motif: 'Date invalide.' }
    if (t > Date.now() + 5 * 60_000) return { ok: false, motif: 'La date du plein ne peut pas être dans le futur.' }
    const doublon = recharges.value.find(r => r.vehiculeId === saisie.vehiculeId && r.litres === saisie.litres && Math.abs(new Date(r.date).getTime() - t) < 10 * 60_000)
    if (doublon) return { ok: false, motif: `Ce plein est déjà enregistré (${doublon.id}).` }
    while (recharges.value.some(r => r.id === `RCH-${String(prochainNumero).padStart(3, '0')}`)) prochainNumero++
    const id = `RCH-${String(prochainNumero++).padStart(3, '0')}`
    recharges.value.push({ ...saisie, id, controles: [], statut: 'valide' })
    rafraichirControles()
    return { ok: true, id }
  }
  const anomalies = computed(() => recharges.value.filter(r => r.statut === 'anomalie'))
  const rechargesDuVehicule = (vehiculeId: string) =>
    [...recharges.value.filter(r => r.vehiculeId === vehiculeId)].sort((a, b) => +new Date(a.date) - +new Date(b.date))

  function litresDelivres(opts: { vehiculeId?: string } = {}) {
    return recharges.value.filter(r => !opts.vehiculeId || r.vehiculeId === opts.vehiculeId).reduce((s, r) => s + r.litres, 0)
  }
  function montantTotal(opts: { vehiculeId?: string } = {}) {
    return recharges.value.filter(r => !opts.vehiculeId || r.vehiculeId === opts.vehiculeId).reduce((s, r) => s + r.montant, 0)
  }

  /** Référence applicable : véhicule et corridor, sinon corridor, sinon défaut. */
  function referenceDe(vehiculeId: string, trajetId?: string): { ref: number; origine: 'vehicule' | 'corridor' | 'defaut' } {
    const p = parametres.value
    const v = trajetId ? p.refsVehicule.find(x => x.vehiculeId === vehiculeId && x.trajetId === trajetId) : undefined
    if (v) return { ref: v.refL100, origine: 'vehicule' }
    if (trajetId && p.refsCorridor[trajetId]) return { ref: p.refsCorridor[trajetId]!, origine: 'corridor' }
    return { ref: p.refDefautL100, origine: 'defaut' }
  }

  /** Consommation plein-à-plein : entre deux pleins complets successifs. */
  const periodesConso = computed<PeriodeConso[]>(() => {
    const out: PeriodeConso[] = []
    const parVehicule = new Map<string, RechargeCarburant[]>()
    recharges.value.forEach(r => {
      if (!parVehicule.has(r.vehiculeId)) parVehicule.set(r.vehiculeId, [])
      parVehicule.get(r.vehiculeId)!.push(r)
    })
    parVehicule.forEach(list => {
      const pleins = list.filter(r => r.pleinComplet).sort((a, b) => +new Date(a.date) - +new Date(b.date))
      for (let i = 1; i < pleins.length; i++) {
        const a = pleins[i - 1]; const b = pleins[i]
        if (!a || !b) continue
        const km = b.odometre - a.odometre
        if (km <= 0) continue
        const litres = list.filter(r => r.date > a.date && r.date <= b.date).reduce((s, r) => s + r.litres, 0)
        const voy = b.voyageId ? voyages.voyages.find(v => v.id === b.voyageId) : undefined
        const { ref, origine } = referenceDe(b.vehiculeId, voy?.trajetId)
        const l100 = Number(((litres / km) * 100).toFixed(1))
        out.push({
          id: `${b.vehiculePlaque} · ${b.id}`,
          vehiculeId: b.vehiculeId, vehiculePlaque: b.vehiculePlaque, du: a.date, au: b.date,
          litres, km, litresPour100km: l100, refConso: ref, origineRef: origine,
          ecartPct: Number((((l100 - ref) / ref) * 100).toFixed(1)),
          chauffeurNom: b.chauffeurNom, chauffeurId: b.chauffeurId,
          trajetId: voy?.trajetId, trajetLibelle: voy?.trajetLibelle,
        })
      }
    })
    return out.sort((a, b) => +new Date(b.au) - +new Date(a.au))
  })

  /* ── Écarts de consommation (FMS-CA-05) ─────────────────────── */
  function statutEcart(p: PeriodeConso): StatutEcartConso {
    const d = p.id ? dossiersEcart.value[p.id] : undefined
    if (d) return d.statut
    return Math.abs(p.ecartPct) > parametres.value.seuilEcartConsoPct ? 'a_qualifier' : 'conforme'
  }
  const ecartsAQualifier = computed(() => periodesConso.value.filter(p => statutEcart(p) === 'a_qualifier'))
  /** Coût des litres consommés au-delà de la référence, au prix moyen de la période. */
  function coutExces(p: PeriodeConso) {
    const excesL = p.litres - (p.refConso * p.km) / 100
    if (excesL <= 0) return 0
    const pleins = recharges.value.filter(r => r.vehiculeId === p.vehiculeId && r.date > p.du && r.date <= p.au)
    const prixMoyen = pleins.length ? pleins.reduce((s, r) => s + r.montant, 0) / Math.max(1, pleins.reduce((s, r) => s + r.litres, 0)) : 0
    return Math.round(excesL * prixMoyen)
  }
  function qualifierEcart(id: string, qualification: QualifEcartCarburant, commentaire: string, par: string): { ok: boolean; motif?: string } {
    const p = periodesConso.value.find(x => x.id === id)
    if (!p) return { ok: false, motif: 'Période introuvable.' }
    const d = dossiersEcart.value[id]
    if (d && d.statut !== 'qualifie') return { ok: false, motif: 'Une retenue est déjà engagée sur cet écart.' }
    dossiersEcart.value[id] = { statut: 'qualifie', qualification, commentaire: commentaire.trim() || undefined, qualifiePar: par, qualifieLe: new Date().toISOString() }
    return { ok: true }
  }
  function proposerRetenue(id: string, montant: number, par: string): { ok: boolean; motif?: string } {
    const d = dossiersEcart.value[id]; const p = periodesConso.value.find(x => x.id === id)
    if (!d || !p || d.statut !== 'qualifie') return { ok: false, motif: "L'écart doit d'abord être qualifié." }
    if (!QUALIFS_IMPUTABLES.includes(d.qualification)) return { ok: false, motif: "Cette cause n'est pas imputable au chauffeur : aucune retenue possible." }
    if (!(montant > 0)) return { ok: false, motif: 'Indiquez un montant supérieur à zéro.' }
    const plafond = coutExces(p)
    if (montant > plafond) return { ok: false, motif: `La retenue ne peut pas dépasser le coût du carburant consommé en trop (${plafond.toLocaleString('fr-FR')} Ar).` }
    d.montantPropose = montant; d.proposePar = par; d.statut = 'en_validation'
    return { ok: true }
  }
  function deciderRetenue(id: string, decision: 'approuve' | 'rejete', valideur: string, commentaire?: string): { ok: boolean; motif?: string } {
    const d = dossiersEcart.value[id]
    if (!d || d.statut !== 'en_validation') return { ok: false, motif: 'Aucune retenue en attente de validation.' }
    if (decision === 'rejete' && !commentaire?.trim()) return { ok: false, motif: 'Motivez le rejet.' }
    d.validation = { valideur, decision, date: new Date().toISOString(), commentaire: commentaire?.trim() || undefined }
    d.statut = decision === 'approuve' ? 'refacture' : 'classe'
    return { ok: true }
  }
  function classerEcart(id: string, par: string, commentaire: string): { ok: boolean; motif?: string } {
    const d = dossiersEcart.value[id]
    if (!d || d.statut !== 'qualifie') return { ok: false, motif: "L'écart doit d'abord être qualifié." }
    d.statut = 'classe'; d.validation = { valideur: par, decision: 'rejete', date: new Date().toISOString(), commentaire: commentaire.trim() || 'Classé sans retenue' }
    return { ok: true }
  }

  /* ── Émissions (FMS-CA-06) ──────────────────────────────────── */
  const co2Kg = (litres: number) => Math.round(litres * parametres.value.facteurCo2KgParL)
  /** Émissions par véhicule : le total à partir de tous les litres délivrés,
   *  l'intensité au kilomètre sur les seules périodes plein à plein mesurées. */
  const emissionsParVehicule = computed(() => {
    const m = new Map<string, { id: string; vehiculeId: string; plaque: string; litres: number; kmMesures: number; litresMesures: number }>()
    recharges.value.forEach(r => {
      const e = m.get(r.vehiculeId) ?? { id: r.vehiculeId, vehiculeId: r.vehiculeId, plaque: r.vehiculePlaque, litres: 0, kmMesures: 0, litresMesures: 0 }
      e.litres += r.litres; m.set(r.vehiculeId, e)
    })
    periodesConso.value.forEach(p => { const e = m.get(p.vehiculeId); if (e) { e.kmMesures += p.km; e.litresMesures += p.litres } })
    return [...m.values()].map(e => ({ ...e, co2Kg: co2Kg(e.litres), gParKm: e.kmMesures ? Math.round((e.litresMesures * parametres.value.facteurCo2KgParL * 1000) / e.kmMesures) : null }))
  })

  /* ── Qualification d'un plein suspect (FMS-CA-03) ───────────── */
  function ouvrirQualification(id: string) { const r = getById(id); if (r) r.statut = 'en_qualification' }
  function qualifier(id: string, qualification: QualifEcartCarburant, commentaire: string) {
    const r = getById(id)
    if (!r || r.statut !== 'anomalie') return
    r.qualification = qualification
    r.commentaire = commentaire
    r.statut = 'qualifie'
  }
  /** Refacturation d'un plein : proposée puis validée par le responsable flotte. */
  function ouvrirValidation(id: string, montantPropose: number) {
    const r = getById(id)
    if (!r || r.statut !== 'qualifie' || !r.qualification || !QUALIFS_IMPUTABLES.includes(r.qualification) || !(montantPropose > 0)) return
    r.montantRefacture = Math.min(montantPropose, r.montant)
    r.statut = 'en_validation'
  }
  function valider(id: string, valideur: string, decision: 'approuve' | 'rejete', commentaire?: string) {
    const r = getById(id)
    if (!r || r.statut !== 'en_validation') return
    r.validation = { valideur, role: 'Responsable Flotte', decision, date: new Date().toISOString(), commentaire }
    r.statut = decision === 'approuve' ? 'refacture' : 'classe'
  }
  function lierTransaction(rechargeId: string, transactionId: string | undefined) {
    const r = getById(rechargeId); if (r) r.transactionId = transactionId
  }
  function reinitialiserParametres() {
    Object.assign(parametres.value, { ...PARAMETRES_CARBURANT_DEFAUT, refsCorridor: { ...PARAMETRES_CARBURANT_DEFAUT.refsCorridor }, refsVehicule: [] })
  }

  return {
    recharges, anomalies, periodesConso, parametres, dossiersEcart, ecartsAQualifier, emissionsParVehicule,
    getById, creer, rechargesDuVehicule, litresDelivres, montantTotal, referenceDe, statutEcart, coutExces, co2Kg,
    ouvrirQualification, qualifier, ouvrirValidation, valider, lierTransaction, reinitialiserParametres,
    qualifierEcart, proposerRetenue, deciderRetenue, classerEcart, evaluerControles,
  }
})
