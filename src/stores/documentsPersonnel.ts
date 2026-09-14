import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DocumentPersonnel, TypeDocument } from '../types'
import { etatEcheance } from '../utils/helpers'
import { dansNJours } from '../utils/horloge'
import { usePersonnelStore } from './personnel'
import { useParametresStore } from './parametres'

export const LIBELLE_TYPE_DOC: Record<TypeDocument, string> = {
  permis: 'Permis de conduire',
  visite_medicale: 'Visite médicale',
  cin: "Carte d'identité nationale",
  contrat: 'Contrat de travail',
  formation: 'Attestation de formation',
  certification: 'Certification',
}

/**
 * Pièces obligatoires par profil.
 * Cahier des charges, module 9 : « permis, visite médicale pour conducteur ».
 */
export const PIECES_OBLIGATOIRES: Record<'roulant' | 'sedentaire', TypeDocument[]> = {
  roulant: ['permis', 'visite_medicale', 'cin', 'contrat'],
  sedentaire: ['cin', 'contrat'],
}

/* Décalage en jours par rapport à aujourd'hui, pour que la démonstration
   montre en permanence des échéances valides, proches et dépassées. */
function dans(jours: number): string {
  return dansNJours(jours)
}

const DOCS: DocumentPersonnel[] = []
let seq = 1
function ajouter(
  personnelId: string,
  type: TypeDocument,
  delivrance: string,
  expiration: string | null,
  extra: Partial<DocumentPersonnel> = {},
) {
  DOCS.push({
    id: `doc-${String(seq++).padStart(3, '0')}`,
    personnelId,
    type,
    libelle: LIBELLE_TYPE_DOC[type],
    dateDelivrance: delivrance,
    dateExpiration: expiration ?? undefined,
    version: 1,
    archive: false,
    ...extra,
  })
}

/* Conducteurs : permis + visite médicale, avec des situations variées. */
const ECHEANCES_CONDUCTEURS: Array<[string, number, number, string]> = [
  ['p-010', 420, 180, 'CE'],
  ['p-011', 300, 12, 'CE'],
  ['p-012', 610, 260, 'CE'],
  ['p-013', 95, 40, 'CE'],
  ['p-014', 540, 21, 'CE'],
  ['p-015', 380, 200, 'C'],
  ['p-016', -18, 60, 'CE'],
  ['p-017', 250, 130, 'CE'],
  ['p-018', 480, -35, 'CE'],
  ['p-019', 700, 300, 'CE'],
]

ECHEANCES_CONDUCTEURS.forEach(([id, jPermis, jVisite, cat], i) => {
  ajouter(id, 'permis', '2019-05-14', dans(jPermis), {
    reference: `PC-${20190000 + i}`,
    categorie: cat,
    fichier: `permis_${id}.pdf`,
  })
  ajouter(id, 'visite_medicale', dans(jVisite - 365), dans(jVisite), {
    reference: `VM-2025-${String(i + 1).padStart(3, '0')}`,
    fichier: `visite_${id}.pdf`,
  })
  ajouter(id, 'cin', '2010-06-02', null, { reference: `CIN-${id}` })
  ajouter(id, 'contrat', '2024-11-04', null, { fichier: `contrat_${id}.pdf` })
  if (i < 6) {
    ajouter(id, 'formation', '2024-11-12', null, {
      reference: 'Conduite préventive poids lourd',
      fichier: `formation_${id}.pdf`,
    })
  }
})

/* Aides conducteurs : permis léger et visite médicale. */
const ECHEANCES_AIDES: Array<[string, number, number]> = [
  ['p-020', 350, 150],
  ['p-021', 210, 25],
  ['p-022', 90, -8],
  ['p-023', 560, 240],
  ['p-024', 140, 55],
]

ECHEANCES_AIDES.forEach(([id, jPermis, jVisite], i) => {
  ajouter(id, 'permis', '2021-03-08', dans(jPermis), {
    reference: `PC-${20210000 + i}`,
    categorie: 'B',
  })
  ajouter(id, 'visite_medicale', dans(jVisite - 365), dans(jVisite))
  ajouter(id, 'cin', '2015-09-18', null, { reference: `CIN-${id}` })
  ajouter(id, 'contrat', '2025-01-13', null)
})

/* Sédentaires : pièces d'identité et contrat. */
;['p-001', 'p-002', 'p-003', 'p-004', 'p-005', 'p-006', 'p-007', 'p-008', 'p-009'].forEach(id => {
  ajouter(id, 'cin', '2012-04-11', null, { reference: `CIN-${id}` })
  ajouter(id, 'contrat', '2024-09-02', null, { fichier: `contrat_${id}.pdf` })
})

export const useDocumentsStore = defineStore('documentsPersonnel', () => {
  const liste = ref<DocumentPersonnel[]>(DOCS)

  let prochainId = liste.value.length + 1
  function creer(saisie: Omit<DocumentPersonnel, 'id' | 'version' | 'archive'>) {
    const id = `doc-perso-${prochainId++}`
    liste.value.push({ ...saisie, id, version: 1, archive: false })
    return id
  }
  function modifier(id: string, saisie: Partial<Omit<DocumentPersonnel, 'id'>>) {
    const d = liste.value.find(x => x.id === id)
    if (d) Object.assign(d, saisie)
  }
  function supprimer(id: string) {
    const i = liste.value.findIndex(x => x.id === id)
    if (i >= 0) liste.value.splice(i, 1)
  }
  const params = useParametresStore()
  const personnel = usePersonnelStore()

  const actifs = computed(() => liste.value.filter(d => !d.archive))

  function parPersonnel(personnelId: string) {
    return actifs.value.filter(d => d.personnelId === personnelId)
  }

  /** État d'une pièce au regard du seuil d'alerte paramétré. */
  function etat(doc: DocumentPersonnel) {
    return etatEcheance(doc.dateExpiration, params.valeurs.seuilAlerteJours)
  }

  /** Pièces manquantes pour une personne, selon son profil. */
  function piecesManquantes(personnelId: string): TypeDocument[] {
    const p = personnel.parId(personnelId)
    if (!p) return []
    const attendues = PIECES_OBLIGATOIRES[p.conduit ? 'roulant' : 'sedentaire']
    const presentes = new Set(parPersonnel(personnelId).map(d => d.type))
    return attendues.filter(t => !presentes.has(t))
  }

  /** Une personne est en règle si aucune pièce obligatoire n'est absente ni expirée. */
  function enRegle(personnelId: string): boolean {
    if (piecesManquantes(personnelId).length > 0) return false
    const p = personnel.parId(personnelId)
    if (!p) return false
    const attendues = PIECES_OBLIGATOIRES[p.conduit ? 'roulant' : 'sedentaire']
    return parPersonnel(personnelId)
      .filter(d => attendues.includes(d.type))
      .every(d => etat(d) !== 'expire')
  }

  /** Toutes les échéances datées, triées de la plus urgente à la plus lointaine. */
  const echeances = computed(() =>
    actifs.value
      .filter(d => d.dateExpiration)
      .map(d => {
        const p = personnel.parId(d.personnelId)
        return {
          doc: d,
          personnelNom: p?.nomComplet ?? '-',
          fonction: p?.fonctionLibelle ?? '-',
          etat: etat(d),
        }
      })
      .sort((a, b) => (a.doc.dateExpiration! < b.doc.dateExpiration! ? -1 : 1)),
  )

  const expirees = computed(() => echeances.value.filter(e => e.etat === 'expire'))
  const proches = computed(() => echeances.value.filter(e => e.etat === 'proche'))

  return {
    liste, actifs, echeances, expirees, proches,
    parPersonnel, etat, piecesManquantes, enRegle,
    creer, modifier, supprimer,
  }
})
