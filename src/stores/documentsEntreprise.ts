import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useTypesDocumentsStore } from './typesDocuments'
import { etatEcheance } from '../utils/helpers'
import { aujourdhuiISO, dansNJours, maintenant, decaler } from '../utils/horloge'
import type { PieceJointe, EtatDocument } from '../types'

/**
 * Documents de l'entreprise (FMS-SC-02) : centralisés, recherchables par
 * mot-clé, type, date ou entité. Un document déposé reste en attente ; il ne
 * devient officiel qu'une fois validé. Le valideur est une autre personne que
 * le déposant, sauf si l'entreprise en décide autrement.
 */
export type StatutValidation = 'en_attente' | 'valide' | 'rejete'
export const LIB_VALIDATION: Record<StatutValidation, { label: string; cls: string }> = {
  en_attente: { label: 'En attente de validation', cls: 'bg-warning-bg text-warning' },
  valide: { label: 'Officiel', cls: 'bg-success-bg text-success' },
  rejete: { label: 'Rejeté', cls: 'bg-danger-bg text-danger' },
}
export interface DocumentEntreprise {
  id: string
  reference: string
  nom: string
  type: string
  entiteId?: string
  motsCles: string[]
  dateDocument: string
  dateFin?: string
  scan?: PieceJointe
  statut: StatutValidation
  deposePar: string
  deposeLe: string
  decision?: { par: string; le: string; motif?: string }
  /** Nouvelle version déposée qui remplace celle-ci une fois validée. */
  remplacePar?: string
}

const CLE = 'fms-ucodis-documents-entreprise'
const CLE_REGLE = 'fms-ucodis-validation-documents'

const SEED: DocumentEntreprise[] = [
  { id: 'DE-001', reference: 'DOC-2024-001', nom: 'Statuts de la société', type: 'statuts', entiteId: 'e1', motsCles: ['statuts', 'juridique'], dateDocument: decaler('2024-03-12'), scan: { nom: 'statuts.pdf' }, statut: 'valide', deposePar: 'Rivo Andrianjafy', deposeLe: decaler('2024-03-15T10:00:00'), decision: { par: 'Faniry Rakotoarisoa', le: decaler('2024-03-16T09:00:00') } },
  { id: 'DE-002', reference: 'DOC-2025-014', nom: 'Licence de transport de marchandises', type: 'licence_transport', entiteId: 'e2', motsCles: ['licence', 'transport', 'ministère'], dateDocument: dansNJours(-330), dateFin: dansNJours(35), scan: { nom: 'licence_transport.pdf' }, statut: 'valide', deposePar: 'Hery Andriamalala', deposeLe: decaler('2025-10-01T08:30:00'), decision: { par: 'Rivo Andrianjafy', le: decaler('2025-10-02T11:00:00') } },
  { id: 'DE-003', reference: 'DOC-2026-021', nom: 'Attestation de régularité fiscale 2026', type: 'attestation_fiscale', entiteId: 'e1', motsCles: ['impôts', 'fiscal'], dateDocument: dansNJours(-5), dateFin: dansNJours(360), scan: { nom: 'attestation_fiscale_2026.pdf' }, statut: 'en_attente', deposePar: 'Faniry Rakotoarisoa', deposeLe: dansNJours(-4) + 'T15:20:00' },
  { id: 'DE-004', reference: 'DOC-2026-018', nom: 'Procédure de contrôle avant départ', type: 'procedure', entiteId: 'e2', motsCles: ['procédure', 'départ', 'sécurité', 'checklist'], dateDocument: dansNJours(-40), scan: { nom: 'procedure_depart_v2.pdf' }, statut: 'rejete', deposePar: 'Tojo Rasoanaivo', deposeLe: dansNJours(-38) + 'T09:00:00', decision: { par: 'Hery Andriamalala', le: dansNJours(-37) + 'T10:00:00', motif: 'Version non signée par la direction.' } },
]

export const useDocumentsEntrepriseStore = defineStore('documentsEntreprise', () => {
  const types = useTypesDocumentsStore()
  const documents = ref<DocumentEntreprise[]>(SEED.map(d => ({ ...d, motsCles: [...d.motsCles] })))
  try { const b = localStorage.getItem(CLE); if (b) documents.value = JSON.parse(b) } catch { /* défaut */ }
  watch(documents, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* stockage plein */ } }, { deep: true })
  const validationParAutrePersonne = ref(true)
  try { const b = localStorage.getItem(CLE_REGLE); if (b != null) validationParAutrePersonne.value = b === 'true' } catch { /* défaut */ }
  watch(validationParAutrePersonne, v => { try { localStorage.setItem(CLE_REGLE, String(v)) } catch { /* ignoré */ } })

  const getById = (id: string) => documents.value.find(d => d.id === id)
  /** Validité, pour un document officiel à durée limitée. */
  function etat(d: DocumentEntreprise): EtatDocument {
    if (types.get(d.type)?.validite === 'illimitee' || !d.dateFin) return 'valide'
    return etatEcheance(d.dateFin, types.get(d.type)?.delaiNotificationJours ?? 30) as EtatDocument
  }

  function deposer(d: Omit<DocumentEntreprise, 'id' | 'reference' | 'statut' | 'deposeLe' | 'decision'>, remplaceId?: string): { ok: boolean; id?: string; motif?: string } {
    if (!d.nom.trim()) return { ok: false, motif: 'Indiquez le nom du document.' }
    const def = types.get(d.type)
    if (!def) return { ok: false, motif: 'Choisissez le type de document.' }
    if (!d.scan) return { ok: false, motif: 'Joignez le document.' }
    if (!d.dateDocument) return { ok: false, motif: 'Indiquez la date du document.' }
    if (d.dateDocument > aujourdhuiISO()) return { ok: false, motif: 'La date du document ne peut pas être dans le futur.' }
    if (def.validite === 'limitee' && !d.dateFin) return { ok: false, motif: 'Ce type a une validité limitée : indiquez la date de fin.' }
    if (d.dateFin && d.dateFin < d.dateDocument) return { ok: false, motif: 'La date de fin ne peut pas précéder la date du document.' }
    let n = documents.value.length + 1
    while (documents.value.some(x => x.id === `DE-${String(n).padStart(3, '0')}`)) n++
    const id = `DE-${String(n).padStart(3, '0')}`
    const annee = aujourdhuiISO().slice(0, 4)
    const numero = Math.max(0, ...documents.value.filter(x => x.reference.startsWith(`DOC-${annee}-`)).map(x => Number(x.reference.split('-')[2]) || 0)) + 1
    documents.value.push({ ...d, nom: d.nom.trim(), id, reference: `DOC-${annee}-${String(numero).padStart(3, '0')}`, statut: 'en_attente', deposeLe: maintenant().toISOString() })
    if (remplaceId) { const ancien = getById(remplaceId); if (ancien) ancien.remplacePar = id }
    return { ok: true, id }
  }
  function decider(id: string, decision: 'valide' | 'rejete', par: string, motif?: string): { ok: boolean; motif?: string } {
    const d = getById(id); if (!d) return { ok: false, motif: 'Document introuvable.' }
    if (d.statut !== 'en_attente') return { ok: false, motif: 'Ce document a déjà été traité.' }
    if (validationParAutrePersonne.value && d.deposePar === par) return { ok: false, motif: 'Le déposant ne peut pas valider ou rejeter son propre document.' }
    if (decision === 'rejete' && !motif?.trim()) return { ok: false, motif: 'Indiquez le motif du rejet.' }
    d.statut = decision; d.decision = { par, le: maintenant().toISOString(), motif: motif?.trim() || undefined }
    return { ok: true }
  }

  const officiels = computed(() => documents.value.filter(d => d.statut === 'valide' && !documents.value.some(x => x.id === d.remplacePar && x.statut === 'valide')))
  const enAttente = computed(() => documents.value.filter(d => d.statut === 'en_attente'))
  return { documents, getById, etat, deposer, decider, officiels, enAttente, validationParAutrePersonne }
})
