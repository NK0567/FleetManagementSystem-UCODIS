import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Personnel, StatutPersonnel } from '../types'
import { aujourdhuiISO } from '../utils/horloge'

/**
 * Effectif d'UCODIS Transport.
 *
 * Dimensionnement repris du cahier des charges : le parc compte dix
 * tracteurs, l'équipe conduite compte donc dix conducteurs et cinq aides
 * conducteurs. Les fonctions sont celles du tableau des responsabilités
 * de la SOP UCD-TRUCK-FLOT-001.
 *
 * Les personnes sont fictives : ce sont des données de démonstration,
 * à remplacer par l'effectif réel lors de la reprise.
 */
type Graine = Omit<Personnel, 'nomComplet'>

const GRAINE: Graine[] = [
  {
    id: 'p-001', matricule: 'UCT-001', nom: 'Rakotoarisoa', prenom: 'Faniry',
    fonctionId: 'f-adm', fonctionLibelle: 'Administrateur système',
    entiteId: 'e1', entiteNom: 'UCODIS Transport', site: 'Siège Antananarivo',
    telephone: '034 12 345 01', email: 'f.rakotoarisoa@ucodis.mg',
    cin: '101 234 567 001', dateNaissance: '1988-03-14',
    contrat: 'CDI', dateEntree: '2024-09-02', statut: 'actif',
    conduit: false, habilite: false, compteSysteme: true,
  },
  {
    id: 'p-002', matricule: 'UCT-002', nom: 'Andriamalala', prenom: 'Hery',
    fonctionId: 'f-rflotte', fonctionLibelle: 'Responsable flotte',
    entiteId: 'e2', entiteNom: 'Service Flotte', site: 'Siège Antananarivo',
    telephone: '034 12 345 02', email: 'h.andriamalala@ucodis.mg',
    cin: '101 234 567 002', dateNaissance: '1982-11-05',
    contrat: 'CDI', dateEntree: '2024-09-02', statut: 'actif',
    conduit: false, habilite: false, compteSysteme: true,
  },
  {
    id: 'p-003', matricule: 'UCT-003', nom: 'Rasoanaivo', prenom: 'Tojo',
    fonctionId: 'f-maint', fonctionLibelle: 'Technicien de maintenance',
    entiteId: 'e3', entiteNom: 'Service Maintenance', site: 'Garage Antananarivo',
    telephone: '034 12 345 03', email: 't.rasoanaivo@ucodis.mg',
    cin: '101 234 567 003', dateNaissance: '1985-06-21',
    contrat: 'CDI', dateEntree: '2024-09-16', statut: 'actif',
    conduit: false, habilite: false, compteSysteme: true,
  },
  {
    id: 'p-004', matricule: 'UCT-004', nom: 'Randrianasolo', prenom: 'Miora',
    fonctionId: 'f-cli', fonctionLibelle: 'Chargée de clientèle',
    entiteId: 'e5', entiteNom: 'Service Clientèle', site: 'Siège Antananarivo',
    telephone: '034 12 345 04', email: 'm.randrianasolo@ucodis.mg',
    cin: '101 234 567 004', dateNaissance: '1991-01-30',
    contrat: 'CDI', dateEntree: '2024-10-01', statut: 'actif',
    conduit: false, habilite: false, compteSysteme: true,
  },
  {
    id: 'p-005', matricule: 'UCT-005', nom: 'Rabemananjara', prenom: 'Lova',
    fonctionId: 'f-com', fonctionLibelle: 'Agent commercial',
    entiteId: 'e6', entiteNom: 'Équipe commerciale UCODIS', site: 'Siège Antananarivo',
    telephone: '034 12 345 05', email: 'l.rabemananjara@ucodis.mg',
    cin: '101 234 567 005', dateNaissance: '1990-08-12',
    contrat: 'CDI', dateEntree: '2024-10-01', statut: 'actif',
    conduit: false, habilite: false, compteSysteme: true,
  },
  {
    id: 'p-006', matricule: 'UCT-006', nom: 'Rakotobe', prenom: 'Naina',
    fonctionId: 'f-depot', fonctionLibelle: 'Agent de dépôt',
    entiteId: 'e7', entiteNom: 'Équipe dépôt', site: 'Dépôt UCODIS Tanjombato',
    telephone: '034 12 345 06',
    cin: '101 234 567 006', dateNaissance: '1993-04-08',
    contrat: 'CDI', dateEntree: '2024-10-14', statut: 'actif',
    conduit: false, habilite: false, compteSysteme: true,
  },
  {
    id: 'p-007', matricule: 'UCT-007', nom: 'Andrianjafy', prenom: 'Rivo',
    fonctionId: 'f-dir', fonctionLibelle: 'Directeur UCODIS Transport',
    entiteId: 'e1', entiteNom: 'UCODIS Transport', site: 'Siège Antananarivo',
    telephone: '034 12 345 07', email: 'r.andrianjafy@ucodis.mg',
    cin: '101 234 567 007', dateNaissance: '1976-02-19',
    contrat: 'CDI', dateEntree: '2024-08-19', statut: 'actif',
    conduit: false, habilite: false, compteSysteme: true,
  },
  {
    id: 'p-008', matricule: 'UCT-008', nom: 'Ravelojaona', prenom: 'Nirina',
    fonctionId: 'f-maint', fonctionLibelle: 'Maintenancier',
    entiteId: 'e3', entiteNom: 'Service Maintenance', site: 'Garage Antananarivo',
    telephone: '034 12 345 08',
    cin: '101 234 567 008', dateNaissance: '1989-09-27',
    contrat: 'CDI', dateEntree: '2024-11-04', statut: 'actif',
    conduit: false, habilite: false, compteSysteme: false,
  },
  {
    id: 'p-009', matricule: 'UCT-009', nom: 'Razafindrakoto', prenom: 'Haja',
    fonctionId: 'f-depot', fonctionLibelle: 'Agent de dépôt',
    entiteId: 'e7', entiteNom: 'Équipe dépôt', site: 'Dépôt UCODIS Tanjombato',
    telephone: '034 12 345 09',
    cin: '101 234 567 009', dateNaissance: '1995-12-03',
    contrat: 'CDD', dateEntree: '2025-02-03', statut: 'actif',
    conduit: false, habilite: false, compteSysteme: false,
  },
]

/* ── Les dix conducteurs, un par tracteur ───────────────────────── */
const CONDUCTEURS: Array<[string, string, string, boolean, StatutPersonnel]> = [
  ['Rakotomanga', 'Solofo', '1986-05-11', true, 'actif'],
  ['Andrianaivo', 'Mamy', '1984-07-22', true, 'actif'],
  ['Rasolofoson', 'Tiana', '1990-02-17', true, 'actif'],
  ['Ratsimbazafy', 'Jaona', '1983-10-09', true, 'actif'],
  ['Randriamampionona', 'Fenohery', '1987-12-28', true, 'actif'],
  ['Rakotondrabe', 'Herizo', '1992-06-15', true, 'actif'],
  ['Andriantsoa', 'Nomena', '1988-04-02', false, 'actif'],
  ['Rabearison', 'Tsiory', '1994-08-19', true, 'conge'],
  ['Razanamalala', 'Jean-Luc', '1981-03-25', false, 'suspendu'],
  ['Rakotonirina', 'Fanomezantsoa', '1991-11-07', true, 'actif'],
]

CONDUCTEURS.forEach(([nom, prenom, naissance, habilite, statut], i) => {
  const n = i + 10
  GRAINE.push({
    id: `p-0${n}`,
    matricule: `UCT-0${n}`,
    nom, prenom,
    fonctionId: 'f-cond', fonctionLibelle: 'Conducteur',
    entiteId: 'e4', entiteNom: 'Équipe conduite', site: 'Dépôt UCODIS Tanjombato',
    telephone: `034 12 346 ${String(i + 1).padStart(2, '0')}`,
    cin: `101 234 568 0${String(i + 1).padStart(2, '0')}`,
    dateNaissance: naissance,
    contrat: 'CDI',
    dateEntree: '2024-11-04',
    statut,
    conduit: true,
    habilite,
    habilitePar: habilite ? 'Hery Andriamalala' : undefined,
    habiliteLe: habilite ? '2024-11-18' : undefined,
    motifRetraitHabilitation:
      statut === 'suspendu' ? 'Habilitation retirée : visite médicale expirée' : undefined,
    compteSysteme: true,
  })
})

/* ── Les cinq aides conducteurs ─────────────────────────────────── */
const AIDES: Array<[string, string, string, boolean]> = [
  ['Ramanantsoa', 'Fidy', '1996-01-14', true],
  ['Razafimahatratra', 'Toky', '1997-05-30', true],
  ['Andrianarivo', 'Sitraka', '1998-09-06', false],
  ['Rakotonandrasana', 'Andry', '1995-07-23', true],
  ['Ranaivoson', 'Mihaja', '1999-03-11', false],
]

AIDES.forEach(([nom, prenom, naissance, habilite], i) => {
  const n = 20 + i
  GRAINE.push({
    id: `p-0${n}`,
    matricule: `UCT-0${n}`,
    nom, prenom,
    fonctionId: 'f-aide', fonctionLibelle: 'Aide conducteur',
    entiteId: 'e4', entiteNom: 'Équipe conduite', site: 'Dépôt UCODIS Tanjombato',
    telephone: `034 12 347 ${String(i + 1).padStart(2, '0')}`,
    cin: `101 234 569 0${String(i + 1).padStart(2, '0')}`,
    dateNaissance: naissance,
    contrat: i < 3 ? 'CDI' : 'CDD',
    dateEntree: '2025-01-13',
    statut: 'actif',
    conduit: true,
    habilite,
    habilitePar: habilite ? 'Hery Andriamalala' : undefined,
    habiliteLe: habilite ? '2025-01-27' : undefined,
    compteSysteme: false,
  })
})

export const usePersonnelStore = defineStore('personnel', () => {
  const liste = ref<Personnel[]>(
    GRAINE.map(p => ({ ...p, nomComplet: `${p.prenom} ${p.nom}` })),
  )

  const actifs = computed(() => liste.value.filter(p => p.statut !== 'archive'))
  const conducteurs = computed(() => actifs.value.filter(p => p.fonctionId === 'f-cond'))
  const aides = computed(() => actifs.value.filter(p => p.fonctionId === 'f-aide'))
  const roulants = computed(() => actifs.value.filter(p => p.conduit))
  const effectif = computed(() => actifs.value.length)

  /**
   * Personnel non habilité alors que sa fonction conduit.
   * SOP, note de la procédure Trajet : seuls les conducteurs dûment formés
   * et habilités sont autorisés à conduire le camion.
   */
  const roulantsNonHabilites = computed(() => roulants.value.filter(p => !p.habilite))

  function parId(id: string) {
    return liste.value.find(p => p.id === id) ?? null
  }

  function parEntite(entiteId: string) {
    return actifs.value.filter(p => p.entiteId === entiteId)
  }

  /** Habiliter ou retirer l'habilitation. Toujours daté, jamais silencieux. */
  function basculerHabilitation(id: string, par: string, motif?: string) {
    const p = parId(id)
    if (!p) return
    if (p.habilite) {
      p.habilite = false
      p.motifRetraitHabilitation = motif || 'Habilitation retirée'
      p.habilitePar = par
      p.habiliteLe = aujourdhuiISO()
    } else {
      p.habilite = true
      p.motifRetraitHabilitation = undefined
      p.habilitePar = par
      p.habiliteLe = aujourdhuiISO()
    }
  }

  /** On archive, on ne supprime jamais : l'historique reste rattaché. */
  function archiver(id: string) {
    const p = parId(id)
    if (!p) return
    p.statut = 'archive'
    p.dateSortie = aujourdhuiISO()
    p.habilite = false
  }

  let prochainSeq = 25
  function prochainMatricule() { return `UCT-0${prochainSeq++}` }
  /** Aperçu du prochain matricule, sans le consommer · pour l'affichage dans le formulaire. */
  function apercuProchainMatricule() { return `UCT-0${prochainSeq}` }

  function creer(saisie: {
    prenom: string; nom: string; fonctionId: string; fonctionLibelle: string
    entiteId: string; entiteNom: string; site: string; telephone: string
    email?: string; cin: string; dateNaissance: string
    genre?: Personnel['genre']; lieuNaissance?: string
    situationFamiliale?: Personnel['situationFamiliale']
    typePieceIdentite?: Personnel['typePieceIdentite']
    categorieId?: string
    contrat: Personnel['contrat']; dateEntree: string; conduit: boolean
    statut?: StatutPersonnel
    matricule?: string
  }) {
    const id = `p-perso-${prochainSeq}`
    const matricule = saisie.matricule?.trim() || prochainMatricule()
    liste.value.push({
      id,
      nomComplet: `${saisie.prenom} ${saisie.nom}`,
      statut: saisie.statut ?? 'actif',
      habilite: false,
      compteSysteme: false,
      ...saisie,
      matricule,
    })
    return id
  }

  return {
    liste, actifs, conducteurs, aides, roulants, effectif, roulantsNonHabilites,
    parId, parEntite, basculerHabilitation, archiver, creer, apercuProchainMatricule,
  }
})
