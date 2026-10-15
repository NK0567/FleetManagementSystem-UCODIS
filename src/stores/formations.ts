import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useDocumentsStore } from './documentsPersonnel'
import { aujourdhuiISO, maintenantMs, maintenant } from '../utils/horloge'

/**
 * Formations ciblées des conducteurs (FMS-SC-07) : déclenchées par un score
 * sous le seuil réglé, un accident, un incident ou une infraction ; leur
 * historique est conservé, y compris les attestations déjà déposées.
 */
export type MotifFormation = 'score' | 'accident' | 'incident' | 'infraction' | 'autre'
export type StatutFormation = 'a_planifier' | 'planifiee' | 'suivie' | 'annulee'
export const LIB_MOTIF_FORMATION: Record<MotifFormation, string> = { score: 'Score de conduite', accident: 'Accident', incident: 'Incident', infraction: 'Infraction', autre: 'Autre' }
export const LIB_STATUT_FORMATION: Record<StatutFormation, { label: string; cls: string }> = {
  a_planifier: { label: 'À planifier', cls: 'bg-warning-bg text-warning' },
  planifiee: { label: 'Planifiée', cls: 'bg-info-bg text-info' },
  suivie: { label: 'Suivie', cls: 'bg-success-bg text-success' },
  annulee: { label: 'Annulée', cls: 'bg-neutral-bg text-neutral' },
}
export interface Formation {
  id: string
  conducteurId: string
  theme: string
  motif: MotifFormation
  origineRef?: string
  declencheeLe: string
  declenchePar: string
  prevueLe?: string
  organisme?: string
  statut: StatutFormation
  suivieLe?: string
  resultat?: string
}
const CLE = 'fms-ucodis-formations'
const CLE_SEUIL = 'fms-ucodis-seuil-formation'

export const useFormationsStore = defineStore('formations', () => {
  const docs = useDocumentsStore()
  // Historique de départ : les attestations de formation déjà déposées.
  const historiqueInitial: Formation[] = docs.liste.filter(d => d.type === 'formation').map((d, i) => ({
    id: `FOR-H${i + 1}`, conducteurId: d.personnelId, theme: d.reference ?? d.libelle, motif: 'autre' as MotifFormation,
    declencheeLe: d.dateDelivrance, declenchePar: 'Reprise de l’historique', statut: 'suivie' as StatutFormation, suivieLe: d.dateDelivrance, resultat: 'Attestation déposée',
  }))
  const formations = ref<Formation[]>(historiqueInitial)
  try { const b = localStorage.getItem(CLE); if (b) formations.value = JSON.parse(b) } catch { /* défaut */ }
  watch(formations, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  /** Score en dessous duquel une formation est proposée. */
  const seuilScore = ref(70)
  try { const b = localStorage.getItem(CLE_SEUIL); if (b) seuilScore.value = Number(b) } catch { /* défaut */ }
  watch(seuilScore, v => { try { localStorage.setItem(CLE_SEUIL, String(v)) } catch { /* ignoré */ } })

  const getById = (id: string) => formations.value.find(f => f.id === id)
  const duConducteur = (id: string) => formations.value.filter(f => f.conducteurId === id).sort((a, b) => b.declencheeLe.localeCompare(a.declencheeLe))
  const enCours = (id: string, motif?: MotifFormation) => formations.value.some(f => f.conducteurId === id && ['a_planifier', 'planifiee'].includes(f.statut) && (!motif || f.motif === motif))

  function declencher(d: { conducteurId: string; theme: string; motif: MotifFormation; origineRef?: string }, par: string): { ok: boolean; id?: string; motif?: string } {
    if (!d.conducteurId) return { ok: false, motif: 'Choisissez le conducteur.' }
    if (!d.theme.trim()) return { ok: false, motif: 'Indiquez le thème de la formation.' }
    if (d.origineRef && formations.value.some(f => f.origineRef === d.origineRef && f.conducteurId === d.conducteurId && f.statut !== 'annulee'))
      return { ok: false, motif: `Une formation est déjà déclenchée pour ${d.origineRef}.` }
    const id = `FOR-${maintenantMs().toString(36).toUpperCase()}`
    formations.value.unshift({ ...d, theme: d.theme.trim(), id, declencheeLe: maintenant().toISOString(), declenchePar: par, statut: 'a_planifier' })
    return { ok: true, id }
  }
  function planifier(id: string, date: string, organisme: string): { ok: boolean; motif?: string } {
    const f = getById(id); if (!f) return { ok: false, motif: 'Formation introuvable.' }
    if (!date) return { ok: false, motif: 'Indiquez la date.' }
    if (date < aujourdhuiISO()) return { ok: false, motif: 'La date prévue ne peut pas être passée.' }
    f.prevueLe = date; f.organisme = organisme.trim() || undefined; f.statut = 'planifiee'
    return { ok: true }
  }
  function marquerSuivie(id: string, resultat: string): { ok: boolean; motif?: string } {
    const f = getById(id); if (!f) return { ok: false, motif: 'Formation introuvable.' }
    if (f.statut !== 'planifiee') return { ok: false, motif: "La formation doit d'abord être planifiée." }
    f.statut = 'suivie'; f.suivieLe = aujourdhuiISO(); f.resultat = resultat.trim() || undefined
    return { ok: true }
  }
  function annuler(id: string, motif: string): { ok: boolean; motif?: string } {
    const f = getById(id); if (!f) return { ok: false, motif: 'Formation introuvable.' }
    if (!motif.trim()) return { ok: false, motif: "Indiquez le motif de l'annulation." }
    if (f.statut === 'suivie') return { ok: false, motif: 'Une formation suivie ne s’annule pas.' }
    f.statut = 'annulee'; f.resultat = `Annulée : ${motif.trim()}`
    return { ok: true }
  }
  const aPlanifier = computed(() => formations.value.filter(f => f.statut === 'a_planifier'))
  return { formations, seuilScore, getById, duConducteur, enCours, declencher, planifier, marquerSuivie, annuler, aPlanifier }
})
