import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePersonnelStore } from './personnel'
import { aujourdhuiISO } from '../utils/horloge'

export type StatutDemande = 'brouillon' | 'attente' | 'approuve' | 'refuse' | 'retourne'

export interface Demande {
  id: number
  personnelId: string
  nom: string
  type: string
  debut: string
  fin: string
  jours: number
  statut: StatutDemande
  soumisLe: string
  motif?: string
  commentaireRetour?: string
  motifRefus?: string
}

/** Soldes par personne et par type de congé. */
export interface Solde {
  personnelId: string
  nom: string
  congeAnnuel: number
  recuperation: number
  maladie: number
  permission: number
}

const DEMANDES: Demande[] = [
  { id: 1, personnelId: 'p-010', nom: 'Solofo Rakotomanga', type: 'Congé annuel', debut: '2026-09-14', fin: '2026-09-21', jours: 6, statut: 'attente', soumisLe: '2026-08-28' },
  { id: 2, personnelId: 'p-017', nom: 'Tsiory Rabearison', type: 'Congé maladie', debut: '2026-09-02', fin: '2026-09-05', jours: 4, statut: 'attente', soumisLe: '2026-09-01' },
  { id: 3, personnelId: 'p-008', nom: 'Nirina Ravelojaona', type: 'Récupération', debut: '2026-09-11', fin: '2026-09-11', jours: 1, statut: 'attente', soumisLe: '2026-09-03' },
  { id: 4, personnelId: 'p-012', nom: 'Tiana Rasolofoson', type: 'Congé annuel', debut: '2026-09-07', fin: '2026-09-18', jours: 10, statut: 'approuve', soumisLe: '2026-08-12' },
  { id: 5, personnelId: 'p-004', nom: 'Miora Randrianasolo', type: 'Permission exceptionnelle', debut: '2026-09-04', fin: '2026-09-04', jours: 1, statut: 'approuve', soumisLe: '2026-08-30' },
  { id: 6, personnelId: 'p-021', nom: 'Toky Razafimahatratra', type: 'Congé annuel', debut: '2026-08-17', fin: '2026-08-28', jours: 10, statut: 'approuve', soumisLe: '2026-07-20' },
  { id: 7, personnelId: 'p-015', nom: 'Herizo Rakotondrabe', type: 'Congé maladie', debut: '2026-08-03', fin: '2026-08-04', jours: 2, statut: 'refuse', soumisLe: '2026-08-03', motifRefus: 'Justificatif médical non fourni dans les délais.' },
  { id: 8, personnelId: 'p-011', nom: 'Mamy Andrianaivo', type: 'Récupération', debut: '2026-09-25', fin: '2026-09-25', jours: 1, statut: 'retourne', soumisLe: '2026-09-01', commentaireRetour: 'Merci de préciser le voyage qui ouvre droit à cette récupération.' },
]

const SOLDES: Solde[] = [
  { personnelId: 'p-010', nom: 'Solofo Rakotomanga', congeAnnuel: 18, recuperation: 3, maladie: 8, permission: 2 },
  { personnelId: 'p-011', nom: 'Mamy Andrianaivo', congeAnnuel: 24, recuperation: 1, maladie: 8, permission: 2 },
  { personnelId: 'p-012', nom: 'Tiana Rasolofoson', congeAnnuel: 8, recuperation: 0, maladie: 8, permission: 1 },
  { personnelId: 'p-013', nom: 'Jaona Ratsimbazafy', congeAnnuel: 21, recuperation: 4, maladie: 6, permission: 2 },
  { personnelId: 'p-014', nom: 'Fenohery Randriamampionona', congeAnnuel: 15, recuperation: 2, maladie: 8, permission: 2 },
  { personnelId: 'p-015', nom: 'Herizo Rakotondrabe', congeAnnuel: 22, recuperation: 0, maladie: 5, permission: 0 },
  { personnelId: 'p-016', nom: 'Nomena Andriantsoa', congeAnnuel: 19, recuperation: 2, maladie: 8, permission: 2 },
  { personnelId: 'p-017', nom: 'Tsiory Rabearison', congeAnnuel: 11, recuperation: 1, maladie: 4, permission: 1 },
  { personnelId: 'p-002', nom: 'Hery Andriamalala', congeAnnuel: 25, recuperation: 0, maladie: 8, permission: 2 },
  { personnelId: 'p-003', nom: 'Tojo Rasoanaivo', congeAnnuel: 20, recuperation: 5, maladie: 8, permission: 2 },
  { personnelId: 'p-004', nom: 'Miora Randrianasolo', congeAnnuel: 17, recuperation: 0, maladie: 8, permission: 1 },
  { personnelId: 'p-008', nom: 'Nirina Ravelojaona', congeAnnuel: 23, recuperation: 6, maladie: 8, permission: 2 },
]

export const useAbsenceStore = defineStore('absences', () => {
  const personnel = usePersonnelStore()
  const liste = ref<Demande[]>(DEMANDES)
  const soldes = ref<Solde[]>(SOLDES)

  const enAttente = computed(() => liste.value.filter(d => d.statut === 'attente'))
  const approuvees = computed(() => liste.value.filter(d => d.statut === 'approuve'))

  /** Approuvées dont la période recouvre le mois en cours. */
  const approuveesCeMois = computed(() => {
    const m = aujourdhuiISO().slice(0, 7)
    return approuvees.value.filter(d => d.debut.slice(0, 7) === m || d.fin.slice(0, 7) === m)
  })

  /** Personnes absentes aujourd'hui, sur la base des demandes approuvées. */
  const absentsAujourdhui = computed(() => {
    const j = aujourdhuiISO()
    return approuvees.value.filter(d => d.debut <= j && d.fin >= j)
  })

  function mesDemandes(personnelId: string) {
    return liste.value.filter(d => d.personnelId === personnelId)
  }

  function monSolde(personnelId: string) {
    return soldes.value.find(s => s.personnelId === personnelId) ?? null
  }

  /** Vrai si une absence approuvée couvre cette date. */
  function absencesLe(date: string) {
    return approuvees.value.filter(d => d.debut <= date && d.fin >= date)
  }

  function approuver(id: number) {
    const d = liste.value.find(x => x.id === id)
    if (d) d.statut = 'approuve'
  }

  function refuser(id: number, motif: string) {
    const d = liste.value.find(x => x.id === id)
    if (d) { d.statut = 'refuse'; d.motifRefus = motif }
  }

  function retourner(id: number, commentaire: string) {
    const d = liste.value.find(x => x.id === id)
    if (d) { d.statut = 'retourne'; d.commentaireRetour = commentaire }
  }

  let prochainId = Math.max(0, ...DEMANDES.map(d => d.id)) + 1

  /** Crée une vraie demande, statut « en attente », comme si l'employé venait de la soumettre. */
  function creerDemande(saisie: {
    personnelId: string; nom: string; type: string
    debut: string; fin: string; jours: number; soumisLe: string
  }) {
    liste.value.unshift({
      id: prochainId++,
      statut: 'attente',
      ...saisie,
    })
  }

  // Le store du personnel sert de référence pour les effectifs
  const effectif = computed(() => personnel.effectif)

  return {
    liste, soldes, enAttente, approuvees, approuveesCeMois, absentsAujourdhui, effectif,
    mesDemandes, monSolde, absencesLe, approuver, refuser, retourner, creerDemande,
  }
})
