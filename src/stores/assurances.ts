import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Sinistre, PoliceAssurance, GraviteSinistre, StatutIndemnisation } from '../types'

export const LIB_GRAVITE_SINISTRE: Record<GraviteSinistre, { label: string; cls: string }> = {
  materiel_leger: { label: 'Matériel léger', cls: 'bg-neutral-bg text-neutral' },
  materiel_lourd: { label: 'Matériel lourd', cls: 'bg-warning-bg text-warning' },
  corporel: { label: 'Corporel', cls: 'bg-danger-bg text-danger' },
  environnemental: { label: 'Environnemental', cls: 'bg-danger-bg text-danger' },
}
export const LIB_INDEMNISATION: Record<StatutIndemnisation, string> = {
  non_declare: 'Non déclaré', declare: 'Déclaré à l\u2019assureur', expertise: 'Expertise en cours',
  accepte: 'Prise en charge acceptée', refuse: 'Prise en charge refusée', regle: 'Indemnisation réglée',
}
const CLS_INDEMNISATION: Record<StatutIndemnisation, string> = {
  non_declare: 'bg-neutral-bg text-neutral', declare: 'bg-info-bg text-info', expertise: 'bg-warning-bg text-warning',
  accepte: 'bg-success-bg text-success', refuse: 'bg-danger-bg text-danger', regle: 'bg-success-bg text-success',
}
export function classeIndemnisation(s: StatutIndemnisation) { return CLS_INDEMNISATION[s] }

export const useAssurancesStore = defineStore('assurances', () => {
  const polices = ref<PoliceAssurance[]>([
    { id: 'POL-001', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA', compagnie: 'ARO Madagascar', numeroPolice: 'ARO-2025-88401',
      couverture: 'Tous risques', dateDebut: '2026-01-01', dateEcheance: '2026-12-31', primeAnnuelleAr: 4_200_000, franchiseAr: 500_000, statut: 'active' },
    { id: 'POL-002', vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA', compagnie: 'ARO Madagascar', numeroPolice: 'ARO-2025-88402',
      couverture: 'Tous risques', dateDebut: '2026-01-01', dateEcheance: '2026-12-31', primeAnnuelleAr: 4_200_000, franchiseAr: 500_000, statut: 'active' },
    { id: 'POL-003', vehiculeId: 'v-tr-4', vehiculePlaque: '4024 TBA', compagnie: 'NY HAVANA Assurances', numeroPolice: 'NYH-2025-3310',
      couverture: 'Responsabilité civile', dateDebut: '2026-02-01', dateEcheance: '2027-01-31', primeAnnuelleAr: 2_100_000, franchiseAr: 800_000, statut: 'active' },
    { id: 'POL-004', vehiculeId: 'v-tr-9', vehiculePlaque: '4029 TBA', compagnie: 'ARO Madagascar', numeroPolice: 'ARO-2025-88409',
      couverture: 'Tous risques', dateDebut: '2026-01-01', dateEcheance: '2026-12-31', primeAnnuelleAr: 4_200_000, franchiseAr: 500_000, statut: 'active' },
  ])

  const sinistres = ref<Sinistre[]>([
    { id: 'SIN-001', reference: 'SIN-2026-004', vehiculeId: 'v-tr-9', vehiculePlaque: '4029 TBA',
      date: '2026-08-29T09:30:00', lieu: 'Dépôt UCODIS Tanjombato, aire de chargement',
      circonstances: "Accrochage à l'arrière lors d'une manœuvre de recul sur l'aire de chargement.",
      gravite: 'materiel_lourd', chauffeurId: 'p-013', chauffeurNom: 'Jaona Ratsimbazafy',
      montantDommagesAr: 4_800_000, statutIndemnisation: 'expertise', policeId: 'POL-004',
      kilometrage: 287_100, responsabiliteUcodis: true, ordreTravailRef: 'OT-2026-0033' },
    { id: 'SIN-002', reference: 'SIN-2026-003', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA',
      date: '2026-07-12T14:20:00', lieu: 'RN2, PK 155, Ambatosenegaly',
      circonstances: "Accrochage latéral avec un véhicule léger lors d'un dépassement. Aucun blessé.",
      gravite: 'materiel_leger', chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga',
      montantDommagesAr: 1_250_000, statutIndemnisation: 'regle', montantIndemniseAr: 1_250_000, policeId: 'POL-001',
      kilometrage: 176_400, responsabiliteUcodis: false },
    { id: 'SIN-003', reference: 'SIN-2026-002', vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA',
      date: '2026-05-03T07:10:00', lieu: 'Sortie du dépôt Tanjombato',
      circonstances: 'Suintement au niveau du carter constaté au démarrage. Épandage limité, confiné par le dépôt.',
      gravite: 'environnemental', chauffeurId: 'p-011', chauffeurNom: 'Mamy Andrianaivo',
      montantDommagesAr: 3_400_000, statutIndemnisation: 'refuse', policeId: 'POL-002',
      kilometrage: 152_200, responsabiliteUcodis: true },
  ])

  const getById = (id: string) => sinistres.value.find(s => s.id === id)
  const getPoliceById = (id: string) => polices.value.find(p => p.id === id)

  const nbSinistres = computed(() => sinistres.value.length)
  const dommagesTotaux = computed(() => sinistres.value.reduce((s, x) => s + (x.montantDommagesAr ?? 0), 0))
  const resteACharge = computed(() => sinistres.value.reduce((s, x) => s + ((x.montantDommagesAr ?? 0) - (x.montantIndemniseAr ?? 0)), 0))

  /** Sinistres par million de km parcourus par le parc · indicateur repris du socle FMS, cible « tendre vers 0 ». */
  const kmTotalParc = 1_500_000 // approximation du parc UCODIS pour la démonstration
  const tauxAccidents = computed(() => Math.round((nbSinistres.value / kmTotalParc) * 1_000_000 * 100) / 100)

  return { polices, sinistres, getById, getPoliceById, nbSinistres, dommagesTotaux, resteACharge, tauxAccidents }
})
