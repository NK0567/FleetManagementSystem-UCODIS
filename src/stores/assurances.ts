import { maintenantMs, maintenant } from '../utils/horloge'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useVehiculeStore } from './vehicules'
import { useMaintenanceStore } from './maintenance'
import { useCodificationIndispoStore } from './codificationIndispo'
import { usePrestatairesStore } from './prestataires'
import type { PieceJointe } from '../types'
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
    { id: 'POL-001', assureurId: 'PRS-010', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA', compagnie: 'ARO Madagascar', numeroPolice: 'ARO-2025-88401',
      couverture: 'Tous risques', dateDebut: '2026-01-01', dateEcheance: '2026-12-31', primeAnnuelleAr: 4_200_000, franchiseAr: 500_000, statut: 'active' },
    { id: 'POL-002', assureurId: 'PRS-010', vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA', compagnie: 'ARO Madagascar', numeroPolice: 'ARO-2025-88402',
      couverture: 'Tous risques', dateDebut: '2026-01-01', dateEcheance: '2026-12-31', primeAnnuelleAr: 4_200_000, franchiseAr: 500_000, statut: 'active' },
    { id: 'POL-003', assureurId: 'PRS-011', vehiculeId: 'v-tr-4', vehiculePlaque: '4024 TBA', compagnie: 'NY HAVANA Assurances', numeroPolice: 'NYH-2025-3310',
      couverture: 'Responsabilité civile', dateDebut: '2026-02-01', dateEcheance: '2027-01-31', primeAnnuelleAr: 2_100_000, franchiseAr: 800_000, statut: 'active' },
    { id: 'POL-004', assureurId: 'PRS-010', vehiculeId: 'v-tr-9', vehiculePlaque: '4029 TBA', compagnie: 'ARO Madagascar', numeroPolice: 'ARO-2025-88409',
      couverture: 'Tous risques', dateDebut: '2026-01-01', dateEcheance: '2026-12-31', primeAnnuelleAr: 4_200_000, franchiseAr: 500_000, statut: 'active' },
  ])

  const sinistres = ref<Sinistre[]>([
    { id: 'SIN-001', reference: 'SIN-2026-004', vehiculeId: 'v-tr-9', vehiculePlaque: '4029 TBA',
      date: '2026-08-29T09:30:00', lieu: 'Dépôt Tanjombato, aire de chargement',
      circonstances: "Accrochage à l'arrière lors d'une manœuvre de recul sur l'aire de chargement.",
      gravite: 'materiel_lourd', chauffeurId: 'p-013', chauffeurNom: 'Jaona Ratsimbazafy',
      montantDommagesAr: 4_800_000, statutIndemnisation: 'expertise', policeId: 'POL-004',
      kilometrage: 287_100, responsabiliteEntreprise: true, ordreTravailRef: 'OT-2026-0033', nature: 'accident', statutDossier: 'ouvert' },
    { id: 'SIN-002', reference: 'SIN-2026-003', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA',
      date: '2026-07-12T14:20:00', lieu: 'RN2, PK 155, Ambatosenegaly',
      circonstances: "Accrochage latéral avec un véhicule léger lors d'un dépassement. Aucun blessé.",
      gravite: 'materiel_leger', chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga',
      montantDommagesAr: 1_250_000, statutIndemnisation: 'regle', montantIndemniseAr: 1_250_000, policeId: 'POL-001',
      kilometrage: 176_400, responsabiliteEntreprise: false, nature: 'accident',
      analyse: 'Dépassement engagé avec une visibilité réduite ; le tiers a été reconnu responsable par le constat amiable.',
      statutDossier: 'clos', clotureLe: '2026-08-06T10:00:00', declarePar: 'Hery Andriamalala',
      historique: [
        { le: '2026-07-12T16:00:00', par: 'Hery Andriamalala', action: 'Accident déclaré' },
        { le: '2026-07-13T09:00:00', par: 'Hery Andriamalala', action: 'Assurance : Déclaré à l\u2019assureur' },
        { le: '2026-07-14T11:00:00', par: 'Hery Andriamalala', action: 'Analyse des causes renseignée' },
        { le: '2026-08-05T15:00:00', par: 'Hery Andriamalala', action: 'Assurance : Indemnisation réglée' },
        { le: '2026-08-06T10:00:00', par: 'Hery Andriamalala', action: 'Dossier clos' },
      ] },
    { id: 'SIN-003', reference: 'SIN-2026-002', vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA',
      date: '2026-05-03T07:10:00', lieu: 'Sortie du dépôt Tanjombato',
      circonstances: 'Suintement au niveau du carter constaté au démarrage. Épandage limité, confiné par le dépôt.',
      gravite: 'environnemental', chauffeurId: 'p-011', chauffeurNom: 'Mamy Andrianaivo',
      montantDommagesAr: 3_400_000, statutIndemnisation: 'refuse', policeId: 'POL-002',
      kilometrage: 152_200, responsabiliteEntreprise: true, statutDossier: 'ouvert' },
  ])

  /* L'assureur d'une police est choisi parmi les prestataires assureurs autorisés. */
  const prestataires = usePrestatairesStore()
  const assureursAutorises = computed(() => prestataires.autorisesDeType('assureur'))
  function changerAssureur(policeId: string, assureurId: string): { ok: boolean; motif?: string } {
    const p = polices.value.find(x => x.id === policeId); if (!p) return { ok: false, motif: 'Police introuvable.' }
    if (!assureurId) return { ok: false, motif: "Choisissez l'assureur." }
    const a = prestataires.getById(assureurId)
    if (!a || a.type !== 'assureur') return { ok: false, motif: "Ce prestataire n'est pas un assureur." }
    if (!a.autorise) return { ok: false, motif: `${a.nom} n'est plus autorisé à travailler avec l'entreprise.` }
    p.assureurId = a.id; p.compagnie = a.nom
    return { ok: true }
  }
  const getById = (id: string) => sinistres.value.find(s => s.id === id)
  const getPoliceById = (id: string) => polices.value.find(p => p.id === id)

  const nbSinistres = computed(() => sinistres.value.length)
  const dommagesTotaux = computed(() => sinistres.value.reduce((s, x) => s + (x.montantDommagesAr ?? 0), 0))
  const resteACharge = computed(() => sinistres.value.reduce((s, x) => s + ((x.montantDommagesAr ?? 0) - (x.montantIndemniseAr ?? 0)), 0))

  /** Accidents par million de km : kilométrage cumulé des véhicules motorisés du parc. */
  const vehicules = useVehiculeStore()
  const kmTotalParc = computed(() => vehicules.tracteurs.reduce((s, v) => s + v.kilometrage, 0))
  const tauxAccidents = computed(() => kmTotalParc.value ? Math.round((sinistres.value.filter(s => (s.nature ?? 'accident') === 'accident').length / kmTotalParc.value) * 1_000_000 * 100) / 100 : 0)

  /* ── Dossiers d'accident et d'incident (FMS-SC-06) ─────────── */
  const trace = (s: Sinistre, par: string, action: string) => { s.historique = [...(s.historique ?? []), { le: maintenant().toISOString(), par, action }] }
  function declarer(d: Omit<Sinistre, 'id' | 'reference' | 'statutIndemnisation' | 'statutDossier' | 'historique'>, par: string): { ok: boolean; id?: string; motif?: string } {
    if (!d.vehiculeId) return { ok: false, motif: 'Choisissez le véhicule.' }
    if (!d.date) return { ok: false, motif: 'Indiquez la date.' }
    if (new Date(d.date).getTime() > maintenantMs()) return { ok: false, motif: 'La date ne peut pas être dans le futur.' }
    if (!d.lieu.trim()) return { ok: false, motif: 'Indiquez le lieu.' }
    if (!d.circonstances.trim()) return { ok: false, motif: 'Décrivez les circonstances.' }
    if (d.montantDommagesAr != null && d.montantDommagesAr < 0) return { ok: false, motif: 'Le montant ne peut pas être négatif.' }
    let n = sinistres.value.length + 1
    while (sinistres.value.some(s => s.id === `SIN-${String(n).padStart(3, '0')}`)) n++
    const id = `SIN-${String(n).padStart(3, '0')}`
    const annee = d.date.slice(0, 4)
    const numero = Math.max(0, ...sinistres.value.filter(x => x.reference.startsWith(`SIN-${annee}-`)).map(x => Number(x.reference.split('-')[2]) || 0)) + 1
    const s: Sinistre = { ...d, lieu: d.lieu.trim(), circonstances: d.circonstances.trim(), id, reference: `SIN-${annee}-${String(numero).padStart(3, '0')}`,
      statutIndemnisation: 'non_declare', statutDossier: 'ouvert', declarePar: par, historique: [] }
    trace(s, par, `${d.nature === 'incident' ? 'Incident' : 'Accident'} déclaré`)
    sinistres.value.unshift(s)
    return { ok: true, id }
  }
  /** Ouvre la réparation : ordre de travail et immobilisation au code choisi. */
  function ouvrirReparation(id: string, par: string, codeIndispo?: string): { ok: boolean; motif?: string } {
    const s = getById(id); if (!s) return { ok: false, motif: 'Dossier introuvable.' }
    if (s.ordreTravailRef) return { ok: false, motif: `Une réparation est déjà ouverte (${s.ordreTravailRef}).` }
    const codif = useCodificationIndispoStore()
    const code = codeIndispo ?? codif.codeAuto('accident')
    s.ordreTravailRef = useMaintenanceStore().creerOT({ vehiculeId: s.vehiculeId, vehiculePlaque: s.vehiculePlaque, origine: 'constat_garage', declarePar: par,
      declareLe: maintenant().toISOString(), symptome: `Réparation après ${s.nature === 'incident' ? 'incident' : 'accident'} ${s.reference} : ${s.circonstances}`,
      gravite: s.gravite === 'materiel_leger' ? 'mineure' : 'majeure', typeMaintenance: 'correctif', kilometrage: s.kilometrage }, { codeIndispo: code })
    trace(s, par, `Réparation ouverte : ${s.ordreTravailRef}`)
    return { ok: true }
  }
  function majAssurance(id: string, statut: StatutIndemnisation, par: string, montantIndemniseAr?: number): { ok: boolean; motif?: string } {
    const s = getById(id); if (!s) return { ok: false, motif: 'Dossier introuvable.' }
    if (montantIndemniseAr != null && (montantIndemniseAr < 0 || (s.montantDommagesAr != null && montantIndemniseAr > s.montantDommagesAr))) return { ok: false, motif: "L'indemnisation ne peut pas dépasser le montant des dommages." }
    s.statutIndemnisation = statut; if (montantIndemniseAr != null) s.montantIndemniseAr = montantIndemniseAr
    trace(s, par, `Assurance : ${LIB_INDEMNISATION[statut]}`)
    return { ok: true }
  }
  function decider(id: string, data: { sanction?: string; analyse?: string }, par: string) {
    const s = getById(id); if (!s) return
    if (data.sanction !== undefined) { s.sanction = data.sanction.trim() || undefined; trace(s, par, s.sanction ? `Sanction : ${s.sanction}` : 'Aucune sanction') }
    if (data.analyse !== undefined) { s.analyse = data.analyse.trim() || undefined; trace(s, par, 'Analyse des causes renseignée') }
  }
  function ajouterPhoto(id: string, photo: PieceJointe, par: string) {
    const s = getById(id); if (!s) return
    s.photos = [...(s.photos ?? []), photo]; trace(s, par, `Photo ajoutée : ${photo.nom}`)
  }
  /** Le dossier se clôt une fois l'analyse faite et, s'il y a réparation, l'ordre de travail clôturé. */
  function cloturer(id: string, par: string): { ok: boolean; motif?: string } {
    const s = getById(id); if (!s) return { ok: false, motif: 'Dossier introuvable.' }
    if (!s.analyse) return { ok: false, motif: "Renseignez l'analyse des causes avant de clore le dossier." }
    if (s.ordreTravailRef) {
      const ot = useMaintenanceStore().getById(s.ordreTravailRef)
      if (ot && ot.statut !== 'cloture' && ot.statut !== 'annule') return { ok: false, motif: `La réparation ${s.ordreTravailRef} n'est pas terminée.` }
    }
    if (['declare', 'expertise'].includes(s.statutIndemnisation)) return { ok: false, motif: "Le traitement par l'assurance est encore en cours." }
    s.statutDossier = 'clos'; s.clotureLe = maintenant().toISOString(); trace(s, par, 'Dossier clos')
    return { ok: true }
  }

  return { polices, sinistres, assureursAutorises, changerAssureur, getById, getPoliceById, nbSinistres, dommagesTotaux, resteACharge, tauxAccidents, kmTotalParc,
    declarer, ouvrirReparation, majAssurance, decider, ajouterPhoto, cloturer }
})
