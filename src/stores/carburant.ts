import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RechargeCarburant, ControleVraisemblance, PeriodeConso, QualifEcartCarburant, CanalRecharge } from '../types'

export const LIB_CANAL: Record<CanalRecharge, string> = {
  mobile: 'Saisie mobile', import: 'Import fichier', regularisation: 'Régularisation',
}
export const LIB_QUALIF: Record<QualifEcartCarburant, string> = {
  technique: 'Cause technique', conduite: 'Comportement de conduite',
  prelevement: 'Prélèvement suspecté', saisie: 'Erreur de saisie',
}

/** Capacité de réservoir par immatriculation · paramétrable, valeur plausible pour un tracteur routier. */
const CAPACITE_RESERVOIR: Record<string, number> = {
  '4021 TBA': 500, '4022 TBA': 500, '4023 TBA': 500, '4024 TBA': 500, '4025 TBA': 400,
  '4026 TBA': 500, '4027 TBA': 400, '4028 TBA': 400, '4029 TBA': 400, '4030 TBA': 450,
}

/** Consommation de référence par trajet (L/100 km) · à valider avec UCODIS. */
export const REF_CONSO: Record<string, number> = {
  'TNR-TOA': 36, 'TNR-ATS': 32, 'TNR-MJN': 39,
}
const TRAJET_PAR_VOYAGE: Record<string, string> = {
  'VOY-001': 'TNR-TOA', 'VOY-002': 'TNR-TOA', 'VOY-003': 'TNR-MJN', 'VOY-004': 'TNR-ATS', 'VOY-005': 'TNR-TOA',
  'VOY-006': 'TNR-ATS', 'VOY-007': 'TNR-TOA', 'VOY-008': 'TNR-MJN', 'VOY-009': 'TNR-ATS', 'VOY-010': 'TNR-TOA', 'VOY-011': 'TNR-MJN',
}

/**
 * Store carburant · méthode plein-à-plein, reprise à l'identique du socle FMS :
 * les litres délivrés sont une donnée exacte relevée à chaque recharge ;
 * la consommation aux 100 km ne se calcule qu'entre deux pleins complets,
 * seule méthode fiable en l'absence de capteur de niveau.
 *
 * Le recoupement par position GPS du socle FMS (prestataire « Camtrack ») est
 * retiré : aucun prestataire de ce type n'est nommé dans les documents
 * UCODIS. Les contrôles de vraisemblance restants (réservoir, odomètre,
 * chauffeur affecté, plage horaire) ne dépendent d'aucun équipement.
 */
export const useCarburantStore = defineStore('carburant', () => {
  const recharges = ref<RechargeCarburant[]>([
    { id: 'RCH-001', date: '2026-08-24T05:20:00', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA',
      chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga', voyageId: 'VOY-001', voyageRef: 'VOY-2026-0148',
      litres: 480, prixLitre: 5400, montant: 2_592_000, odometre: 182_100, pleinComplet: true,
      lieu: 'Dépôt UCODIS Tanjombato', lat: -18.8792, lng: 47.5079,
      positionVehicule: { lat: -18.8802, lng: 47.5091, ecartKm: 0.15 },
      canal: 'mobile', controles: [], statut: 'valide' },
    { id: 'RCH-002', date: '2026-08-24T14:32:00', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA',
      chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga', voyageId: 'VOY-001', voyageRef: 'VOY-2026-0148',
      litres: 175, prixLitre: 5650, montant: 988_750, odometre: 182_478, pleinComplet: true,
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
      litres: 160, prixLitre: 5700, montant: 912_000, odometre: 120_461, pleinComplet: true,
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
      litres: 150, prixLitre: 5700, montant: 855_000, odometre: 289_052, pleinComplet: true,
      lieu: 'Station Toamasina', lat: -18.1492, lng: 49.4023, canal: 'import', controles: [], statut: 'valide' },
    { id: 'RCH-017', date: '2026-08-22T05:20:00', vehiculeId: 'v-tr-10', vehiculePlaque: '4030 TBA',
      chauffeurId: 'p-019', chauffeurNom: 'Fanomezantsoa Rakotonirina', voyageId: 'VOY-011', voyageRef: 'VOY-2026-0140',
      litres: 420, prixLitre: 5400, montant: 2_268_000, odometre: 112_000, pleinComplet: true,
      lieu: 'Dépôt UCODIS Tanjombato', lat: -18.8792, lng: 47.5079, canal: 'mobile', controles: [], statut: 'valide' },
    { id: 'RCH-018', date: '2026-08-22T18:00:00', vehiculeId: 'v-tr-10', vehiculePlaque: '4030 TBA',
      chauffeurId: 'p-019', chauffeurNom: 'Fanomezantsoa Rakotonirina', voyageId: 'VOY-011', voyageRef: 'VOY-2026-0140',
      litres: 200, prixLitre: 5700, montant: 1_140_000, odometre: 112_570, pleinComplet: true,
      lieu: 'Station Mahajanga', lat: -15.7167, lng: 46.3167, canal: 'import', controles: [], statut: 'valide' },
  ])

  function evaluerControles(r: RechargeCarburant): ControleVraisemblance[] {
    const out: ControleVraisemblance[] = []
    const capacite = CAPACITE_RESERVOIR[r.vehiculePlaque]

    out.push({
      code: 'volume_sup_reservoir', libelle: 'Volume délivré compatible avec la capacité du réservoir',
      ok: capacite == null || r.litres <= capacite,
      detail: capacite == null ? 'Capacité non renseignée' : `${r.litres} L délivrés, réservoir ${capacite} L`,
    })

    const precedente = recharges.value
      .filter(x => x.vehiculeId === r.vehiculeId && new Date(x.date) < new Date(r.date))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))[0]

    out.push({
      code: 'odometre_incoherent', libelle: 'Index kilométrique cohérent avec la recharge précédente',
      ok: !precedente || r.odometre > precedente.odometre,
      detail: precedente ? `${precedente.odometre.toLocaleString('fr-FR')} → ${r.odometre.toLocaleString('fr-FR')} km` : 'Première recharge enregistrée',
    })

    out.push({
      code: 'chauffeur_non_affecte', libelle: 'Chauffeur affecté au véhicule à cette date',
      ok: !!r.chauffeurId, detail: r.chauffeurNom ?? 'Aucun chauffeur rattaché',
    })

    const h = new Date(r.date).getHours()
    out.push({
      code: 'hors_plage', libelle: 'Recharge dans la plage horaire habituelle (04 h à 20 h)',
      ok: h >= 4 && h <= 20, detail: `${String(h).padStart(2, '0')} h`,
    })

    return out
  }

  function rafraichirControles() {
    recharges.value.forEach(r => {
      r.controles = evaluerControles(r)
      const ko = r.controles.some(c => !c.ok)
      if (r.statut !== 'qualifie' && r.statut !== 'classe' && r.statut !== 'en_qualification') {
        r.statut = ko ? 'anomalie' : 'valide'
      }
    })
  }
  rafraichirControles()

  const getById = (id: string) => recharges.value.find(r => r.id === id)
  let prochainNumero = recharges.value.length + 1
  function creer(saisie: Omit<RechargeCarburant, 'id' | 'controles' | 'statut'>) {
    const id = `RCH-import-${prochainNumero++}`
    recharges.value.push({ ...saisie, id, controles: [], statut: 'valide' })
    rafraichirControles()
    return id
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
        const trajetCode = b.voyageId ? TRAJET_PAR_VOYAGE[b.voyageId] : undefined
        const ref = trajetCode ? REF_CONSO[trajetCode] ?? 37 : 37
        const l100 = Number(((litres / km) * 100).toFixed(1))
        out.push({
          vehiculeId: b.vehiculeId, vehiculePlaque: b.vehiculePlaque, du: a.date, au: b.date,
          litres, km, litresPour100km: l100, refConso: ref,
          ecartPct: Number((((l100 - ref) / ref) * 100).toFixed(1)),
          chauffeurNom: b.chauffeurNom,
        })
      }
    })
    return out.sort((a, b) => +new Date(b.au) - +new Date(a.au))
  })

  function ouvrirQualification(id: string) { const r = getById(id); if (r) r.statut = 'en_qualification' }
  function qualifier(id: string, qualification: QualifEcartCarburant, commentaire: string) {
    const r = getById(id)
    if (!r) return
    r.qualification = qualification
    r.commentaire = commentaire
    r.statut = 'qualifie'
  }

  /** Refacturation : proposée par l'exploitation, validée par une seule
   *  signature (Responsable Flotte) · aucun circuit à deux niveaux n'est
   *  documenté pour UCODIS, contrairement au socle FMS. */
  function ouvrirValidation(id: string, montantPropose: number) {
    const r = getById(id)
    if (!r) return
    r.montantRefacture = montantPropose
    r.statut = 'en_validation'
  }
  function valider(id: string, valideur: string, decision: 'approuve' | 'rejete', commentaire?: string) {
    const r = getById(id)
    if (!r) return
    r.validation = { valideur, role: 'Responsable Flotte', decision, date: new Date().toISOString(), commentaire }
    r.statut = decision === 'approuve' ? 'refacture' : 'classe'
  }

  return {
    recharges, anomalies, periodesConso,
    getById, creer, rechargesDuVehicule, litresDelivres, montantTotal,
    ouvrirQualification, qualifier, ouvrirValidation, valider,
  }
})
