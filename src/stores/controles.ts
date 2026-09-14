import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChecklistRoute, PointChecklistRoute, ReleveChecklist, PosteAudit, VerdictPoste, AuditConformite } from '../types'

/**
 * Les seize points, repris tels quels du formulaire « Checklist sur
 * Route » du socle FMS (source citée dans le code de référence :
 * formulaire papier v4, mise à jour du 30/10/2024). Aucun formulaire équivalent
 * n'a été fourni par UCODIS à ce jour ; ces points servent de base de
 * travail en attendant, comme demandé.
 */
export const POINTS_CHECKLIST_ROUTE: PointChecklistRoute[] = [
  { code: 'FRS', libelle: 'Frein de service' },
  { code: 'FST', libelle: 'Frein de stationnement' },
  { code: 'FLX', libelle: "Flexible - fuite d'air, branchement" },
  { code: 'DIR', libelle: 'Direction' },
  { code: 'KLX', libelle: 'Klaxon' },
  { code: 'ESG', libelle: 'Essuie-glace' },
  { code: 'RET', libelle: 'Rétroviseur' },
  { code: 'SEC', libelle: 'Matériel de secours - réflecteur, panneau' },
  { code: 'ECL', libelle: 'Éclairage et signalisation' },
  { code: 'PNE', libelle: 'Pneumatiques - clous, gonflage' },
  { code: 'SUS', libelle: 'Suspension' },
  { code: 'CHA', libelle: 'Cadre de châssis' },
  { code: 'ATT', libelle: "Dispositif d'attelage - sellette, cadenas, chaîne" },
  { code: 'EXT', libelle: 'Extincteurs - expiration, plomb, goupille, pression' },
  { code: 'CAL', libelle: 'Cales' },
  { code: 'BAC', libelle: 'Bâche et sanglage du chargement' },
]

export const useControlesStore = defineStore('controles', () => {
  const checklists = ref<ChecklistRoute[]>([
    {
      id: 'CKL-001', reference: 'CKL-2026-0151', voyageId: 'VOY-002', voyageRef: 'VOY-2026-0149',
      vehiculeId: 'v-tr-3', tracteurPlaque: '4023 TBA', semiRemorquePlaque: 'RM 4103',
      chauffeurId: 'p-012', chauffeurNom: 'Tiana Rasolofoson',
      dateDebut: '2026-08-29T06:20:00',
      releves: [
        { pause: 1, horodatage: '2026-08-29T06:20:00', lieu: 'Dépôt UCODIS Tanjombato',
          resultats: {
            FRS: 'conforme', FST: 'conforme', FLX: 'conforme', DIR: 'conforme', KLX: 'conforme',
            ESG: 'conforme', RET: 'conforme', SEC: 'conforme', ECL: 'conforme', PNE: 'conforme',
            SUS: 'conforme', CHA: 'conforme', ATT: 'conforme', EXT: 'conforme', CAL: 'conforme',
            BAC: 'anomalie',
          },
          commentaire: 'Sangle avant détendue, resserrée avant départ.' },
      ],
      signeParChauffeur: true, synchroniseLe: '2026-08-29T06:35:00',
    },
    {
      id: 'CKL-002', reference: 'CKL-2026-0148', voyageId: 'VOY-001', voyageRef: 'VOY-2026-0148',
      vehiculeId: 'v-tr-1', tracteurPlaque: '4021 TBA', semiRemorquePlaque: 'RM 4101',
      chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga',
      dateDebut: '2026-08-24T05:40:00',
      releves: [
        { pause: 1, horodatage: '2026-08-24T05:40:00', lieu: 'Dépôt UCODIS Tanjombato',
          resultats: {
            FRS: 'conforme', FST: 'conforme', FLX: 'conforme', DIR: 'conforme', KLX: 'conforme',
            ESG: 'anomalie', RET: 'conforme', SEC: 'conforme', ECL: 'conforme', PNE: 'conforme',
            SUS: 'conforme', CHA: 'conforme', ATT: 'conforme', EXT: 'non_verifie', CAL: 'conforme',
            BAC: 'conforme',
          },
          commentaire: "Essuie-glace côté passager use, à remplacer au retour." },
        { pause: 2, horodatage: '2026-08-24T09:05:00', lieu: 'Relais Moramanga',
          resultats: {
            FRS: 'conforme', FST: 'conforme', FLX: 'conforme', DIR: 'conforme', KLX: 'conforme',
            ESG: 'anomalie', RET: 'conforme', SEC: 'conforme', ECL: 'conforme', PNE: 'conforme',
            SUS: 'conforme', CHA: 'conforme', ATT: 'conforme', EXT: 'conforme', CAL: 'conforme',
            BAC: 'conforme',
          } },
      ],
      signeParChauffeur: true, synchroniseLe: '2026-08-24T18:20:00',
    },
  ])

  const getById = (id: string) => checklists.value.find(c => c.id === id)

  function nbAnomalies(c: ChecklistRoute) {
    return c.releves.reduce((s, r) => s + Object.values(r.resultats).filter(v => v === 'anomalie').length, 0)
  }
  const avecAnomalie = computed(() => checklists.value.filter(c => nbAnomalies(c) > 0))
  const signees = computed(() => checklists.value.filter(c => c.signeParChauffeur))
  const relevesTotaux = computed(() => checklists.value.reduce((s, c) => s + c.releves.length, 0))

  /* ══ Audits de conformité (seconde vue) ══════════════════════ */
  const POSTES_AUDIT: PosteAudit[] = [
    { code: '100.10', categorie: 'Type et réglementation', libelle: 'Type de véhicule et catégorie' },
    { code: '102.10', categorie: 'Poids et dimensions', libelle: 'PTAC et PTRA' },
    { code: '102.20', categorie: 'Poids et dimensions', libelle: 'Dimensions hors tout' },
    { code: '104.10', categorie: 'Identification', libelle: "Frappe à froid du châssis - 17 caractères" },
    { code: '104.20', categorie: 'Identification', libelle: 'Concordance des plaques et de la carte grise' },
    { code: '106.10', categorie: 'Ordinateur de bord', libelle: 'Boîtier embarqué et enregistrement des données' },
    { code: '110.10', categorie: 'Châssis', libelle: 'État du cadre de châssis' },
    { code: '112.10', categorie: 'Chaîne cinématique', libelle: 'Transmission et arbres' },
    { code: '114.10', categorie: 'Échappement', libelle: 'Étanchéité et fixation' },
    { code: '116.10', categorie: 'Essieux', libelle: 'État et jeu des essieux' },
    { code: '118.10', categorie: 'Roues et pneumatiques', libelle: 'Usure, pression, homogénéité' },
    { code: '122.50.1', categorie: 'Freinage', libelle: 'Efficacité du frein de service' },
    { code: '122.50.2', categorie: 'Freinage', libelle: 'Efficacité du frein de stationnement' },
    { code: '124.10', categorie: "Réservoirs d'air", libelle: 'Étanchéité et purge' },
    { code: '140.10', categorie: 'Équipement électrique', libelle: 'Faisceaux et connexions' },
    { code: '142.10', categorie: 'Éclairage et signalisation', libelle: 'Feux avant et arrière' },
    { code: '142.20', categorie: 'Éclairage et signalisation', libelle: 'Feux de gabarit et catadioptres' },
  ]

  const audits = ref<AuditConformite[]>([
    {
      id: 'AUD-001', reference: 'AUD-2026-004', vehiculeId: 'v-tr-1', tracteurPlaque: '4021 TBA', semiRemorquePlaque: 'RM 4101',
      date: '2026-08-15T09:00:00', auditeur: 'Tojo Rasoanaivo',
      resultats: POSTES_AUDIT.map(p => ({ code: p.code, verdict: 'conforme' as VerdictPoste })),
      conforme: true,
    },
    {
      id: 'AUD-002', reference: 'AUD-2026-003', vehiculeId: 'v-tr-2', tracteurPlaque: '4022 TBA', semiRemorquePlaque: 'RM 4102',
      date: '2026-07-20T10:30:00', auditeur: 'Tojo Rasoanaivo',
      resultats: POSTES_AUDIT.map((p, i) => ({
        code: p.code,
        verdict: i === 11 ? 'non_conforme' as VerdictPoste : i === 4 ? 'conforme_observation' as VerdictPoste : 'conforme' as VerdictPoste,
        observation: i === 11 ? 'Frein de service en limite basse d\u2019efficacité, réglage requis.' : i === 4 ? 'Plaque légèrement décollée, à recoller.' : undefined,
      })),
      conforme: false, contreVisiteLe: '2026-08-05T09:00:00',
      commentaire: "Contre-visite programmée automatiquement dès la non-conformité relevée sur le poste 122.50.1.",
    },
  ])

  const getAuditById = (id: string) => audits.value.find(a => a.id === id)
  function nbNonConformes(a: AuditConformite) { return a.resultats.filter(r => r.verdict === 'non_conforme').length }
  const auditsNonConformes = computed(() => audits.value.filter(a => !a.conforme))

  return {
    checklists, getById, nbAnomalies, avecAnomalie, signees, relevesTotaux,
    POSTES_AUDIT, audits, getAuditById, nbNonConformes, auditsNonConformes,
  }
})
