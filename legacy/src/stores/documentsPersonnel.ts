import { useAlertesStore } from './alertes'
import { defineStore } from 'pinia'
import { ref, computed, reactive, watch } from 'vue'
import type { DocumentPersonnel, TypeDocument, EtatDocument, StatutSaisiDocument } from '../types'
import { useTypesDocumentsStore, LIBELLES_TYPES_DOCUMENTS } from './typesDocuments'
import { useReglesDocumentsStore } from './reglesDocuments'
import { aujourdhuiISO, decaler } from '../utils/horloge'
import { etatEcheance } from '../utils/helpers'
import { dansNJours } from '../utils/horloge'
import { usePersonnelStore } from './personnel'
import { useParametresStore } from './parametres'

/** Libellés des types, tenus dans le référentiel des types de documents. */
export const LIBELLE_TYPE_DOC = LIBELLES_TYPES_DOCUMENTS

/** Pièces obligatoires par profil, déduites du référentiel (réactif). */
export const PIECES_OBLIGATOIRES = reactive<Record<'roulant' | 'sedentaire', TypeDocument[]>>({ roulant: [], sedentaire: [] })

/* Décalage en jours par rapport à aujourd'hui, pour que la démonstration
   montre en permanence des échéances valides, proches et dépassées. */
function dans(jours: number): string {
  return dansNJours(jours)
}

const LIBELLES_SEED: Record<string, string> = {
  permis: 'Permis de conduire', visite_medicale: 'Visite médicale', cin: "Carte d'identité nationale",
  contrat: 'Contrat de travail', formation: 'Attestation de formation', certification: 'Certification',
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
    libelle: LIBELLES_SEED[type] ?? type,
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
  ajouter(id, 'permis', decaler('2019-05-14'), dans(jPermis), {
    reference: `PC-${20190000 + i}`,
    categorie: cat,
    fichier: `permis_${id}.pdf`,
  })
  ajouter(id, 'visite_medicale', dans(jVisite - 365), dans(jVisite), {
    reference: `VM-2025-${String(i + 1).padStart(3, '0')}`,
    fichier: `visite_${id}.pdf`,
  })
  ajouter(id, 'cin', decaler('2010-06-02'), null, { reference: `CIN-${id}` })
  ajouter(id, 'contrat', decaler('2024-11-04'), null, { fichier: `contrat_${id}.pdf` })
  if (i < 6) {
    ajouter(id, 'formation', decaler('2024-11-12'), null, {
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
  ajouter(id, 'permis', decaler('2021-03-08'), dans(jPermis), {
    reference: `PC-${20210000 + i}`,
    categorie: 'B',
  })
  ajouter(id, 'visite_medicale', dans(jVisite - 365), dans(jVisite))
  ajouter(id, 'cin', decaler('2015-09-18'), null, { reference: `CIN-${id}` })
  ajouter(id, 'contrat', decaler('2025-01-13'), null)
})

/* Sédentaires : pièces d'identité et contrat. */
;['p-001', 'p-002', 'p-003', 'p-004', 'p-005', 'p-006', 'p-007', 'p-008', 'p-009'].forEach(id => {
  ajouter(id, 'cin', decaler('2012-04-11'), null, { reference: `CIN-${id}` })
  ajouter(id, 'contrat', decaler('2024-09-02'), null, { fichier: `contrat_${id}.pdf` })
})

export const useDocumentsStore = defineStore('documentsPersonnel', () => {
  const liste = ref<DocumentPersonnel[]>(DOCS)
  const types = useTypesDocumentsStore()
  const regles = useReglesDocumentsStore()
  const params = useParametresStore()
  const personnel = usePersonnelStore()

  watch(() => types.types, () => {
    PIECES_OBLIGATOIRES.roulant = types.obligatoires('personne', 'roulant').map(t => t.code)
    PIECES_OBLIGATOIRES.sedentaire = types.obligatoires('personne', 'sedentaire').map(t => t.code)
  }, { deep: true, immediate: true })

  let prochainId = liste.value.length + 1
  function verifier(saisie: Partial<DocumentPersonnel>): string | null {
    if (!saisie.personnelId) return 'Choisissez la personne.'
    const def = saisie.type ? types.get(saisie.type) : undefined
    if (!def) return 'Choisissez le type de document.'
    if (def.validite === 'limitee' && !saisie.dateExpiration) return 'Ce type de document a une validité limitée : indiquez sa date de fin.'
    if (saisie.dateDelivrance && saisie.dateExpiration && saisie.dateExpiration < saisie.dateDelivrance) return "La date de fin ne peut pas précéder la date d'émission."
    if (saisie.dateDelivrance && saisie.dateDelivrance > aujourdhuiISO()) return "La date d'émission ne peut pas être dans le futur."
    if (saisie.delaiNotificationJours != null && saisie.delaiNotificationJours < 0) return 'Le délai de notification ne peut pas être négatif.'
    return null
  }
  /** Un nouveau document remplace le précédent du même type pour la même personne. */
  function creer(saisie: Omit<DocumentPersonnel, 'id' | 'version' | 'archive'>): string {
    const id = `doc-perso-${prochainId++}`
    const precedents = actifs.value.filter(d => d.personnelId === saisie.personnelId && d.type === saisie.type)
    precedents.forEach(d => { d.remplacePar = id })
    liste.value.push({ ...saisie, id, version: (precedents[0]?.version ?? 0) + 1, archive: false })
    return id
  }
  function creerVerifie(saisie: Omit<DocumentPersonnel, 'id' | 'version' | 'archive'>): { ok: boolean; id?: string; motif?: string } {
    const motif = verifier(saisie); if (motif) return { ok: false, motif }
    return { ok: true, id: creer(saisie) }
  }
  function modifier(id: string, saisie: Partial<Omit<DocumentPersonnel, 'id'>>): { ok: boolean; motif?: string } {
    const d = liste.value.find(x => x.id === id); if (!d) return { ok: false, motif: 'Document introuvable.' }
    const motif = verifier({ ...d, ...saisie }); if (motif) return { ok: false, motif }
    Object.assign(d, saisie)
    return { ok: true }
  }
  function marquer(id: string, statut: StatutSaisiDocument | undefined, motif?: string): { ok: boolean; motif?: string } {
    const d = liste.value.find(x => x.id === id); if (!d) return { ok: false, motif: 'Document introuvable.' }
    if (statut && !motif?.trim()) return { ok: false, motif: 'Indiquez le motif.' }
    d.statutSaisi = statut; d.motifStatut = statut ? motif!.trim() : undefined
    return { ok: true }
  }
  function supprimer(id: string) {
    const i = liste.value.findIndex(x => x.id === id)
    if (i < 0) return
    liste.value.filter(d => d.remplacePar === id).forEach(d => { d.remplacePar = undefined })
    liste.value.splice(i, 1)
  }

  const actifs = computed(() => liste.value.filter(d => !d.archive && !d.remplacePar))

  function parPersonnel(personnelId: string) {
    return actifs.value.filter(d => d.personnelId === personnelId)
  }

  function delaiDe(doc: DocumentPersonnel) { return doc.delaiNotificationJours ?? types.get(doc.type)?.delaiNotificationJours ?? 0 }
  /** État calculé à la consultation, jamais enregistré ; seuls annulé et perdu se saisissent. */
  function etat(doc: DocumentPersonnel): EtatDocument {
    if (doc.statutSaisi) return doc.statutSaisi
    if (types.get(doc.type)?.validite === 'illimitee' && !doc.dateExpiration) return 'valide'
    if (!doc.dateExpiration) return types.get(doc.type)?.validite === 'illimitee' ? 'valide' : 'absent'
    return etatEcheance(doc.dateExpiration, delaiDe(doc)) as EtatDocument
  }
  const libelle = (doc: DocumentPersonnel) => doc.libelle?.trim() || types.get(doc.type)?.libelle || doc.type
  const profil = (personnelId: string) => (personnel.parId(personnelId)?.conduit ? 'roulant' : 'sedentaire')

  /** Pièces obligatoires qui ne sont pas en règle pour une personne, selon son
   *  profil : absentes, expirées, annulées ou perdues. */
  function piecesManquantes(personnelId: string): TypeDocument[] {
    if (!personnel.parId(personnelId)) return []
    return piecesObligatoires(personnelId).filter(x => !x.valide).map(x => x.code)
  }
  /** Pièces obligatoires jamais déposées pour une personne. */
  function piecesAbsentes(personnelId: string): TypeDocument[] {
    if (!personnel.parId(personnelId)) return []
    return piecesObligatoires(personnelId).filter(x => !x.doc).map(x => x.code)
  }

  /** Chaque pièce obligatoire du profil, avec son document et son état : le même calcul pour tous les écrans. */
  function piecesObligatoires(personnelId: string) {
    const docs = parPersonnel(personnelId)
    return types.obligatoires('personne', profil(personnelId)).map(t => {
      const doc = docs.find(d => d.type === t.code)
      return { code: t.code, libelle: t.libelle, doc, etat: doc ? etat(doc) : 'absent' as const, valide: !!doc && ['valide', 'proche'].includes(etat(doc)) }
    })
  }
  /** En règle à une date passée : pour chaque pièce obligatoire, un document
   *  délivré avant cette date et encore valide ce jour-là (historique compris). */
  function enRegleAu(personnelId: string, date: string): boolean {
    if (!personnel.parId(personnelId)) return false
    const docs = liste.value.filter(d => d.personnelId === personnelId && !d.statutSaisi)
    return types.obligatoires('personne', profil(personnelId)).every(t => docs.some(d => d.type === t.code && d.dateDelivrance.slice(0, 10) <= date
      && (d.dateExpiration ? d.dateExpiration.slice(0, 10) >= date : types.get(d.type)?.validite === 'illimitee')))
  }
  /** En règle : chaque pièce obligatoire est présente et en cours de validité. */
  function enRegle(personnelId: string): boolean {
    if (!personnel.parId(personnelId)) return false
    return piecesObligatoires(personnelId).every(x => x.valide)
  }

  function notificationLe(doc: DocumentPersonnel) {
    if (!doc.dateExpiration) return null
    return new Date(new Date(doc.dateExpiration).getTime() - delaiDe(doc) * 86_400_000).toISOString().slice(0, 10)
  }
  function escaladeLe(doc: DocumentPersonnel) {
    if (!doc.dateExpiration || etat(doc) !== 'expire') return null
    return new Date(new Date(doc.dateExpiration).getTime() + useAlertesStore().regles.document.delaiHeures * 3_600_000).toISOString().slice(0, 10)
  }
  const escalades = computed(() => actifs.value.filter(d => { const e = escaladeLe(d); return !!e && !!types.get(d.type)?.obligatoire && e <= aujourdhuiISO() }))

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
    liste, actifs, echeances, expirees, proches, escalades,
    parPersonnel, etat, libelle, delaiDe, piecesManquantes, piecesAbsentes, enRegle, enRegleAu, notificationLe, escaladeLe,
    creer, creerVerifie, modifier, marquer, supprimer, piecesObligatoires,
  }
})
