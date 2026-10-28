import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/**
 * Types d'équipements embarqués (FMS-DB-05, PA-03) : liste paramétrable.
 * Un type peut avoir une échéance (vérification ou remplacement), avec son
 * préavis d'alerte en jours ; un type marqué « caméra » est activé à la
 * délivrance de l'autorisation de départ.
 */
export interface TypeEquipementDef { code: string; libelle: string; avecEcheance: boolean; preavisJours: number; camera: boolean; actif: boolean }
export const PREAVIS_EQUIPEMENT_DEFAUT = 30
export const TYPES_EQUIPEMENTS_DEFAUT: TypeEquipementDef[] = [
  { code: 'obc', libelle: 'Boîtier embarqué', avecEcheance: false, preavisJours: 30, camera: false, actif: true },
  { code: 'gps', libelle: 'Balise GPS', avecEcheance: false, preavisJours: 30, camera: false, actif: true },
  { code: 'dms', libelle: 'Caméra embarquée', avecEcheance: false, preavisJours: 30, camera: true, actif: true },
  { code: 'extincteur', libelle: 'Extincteur', avecEcheance: true, preavisJours: 30, camera: false, actif: true },
  { code: 'kit_antipollution', libelle: 'Kit antipollution', avecEcheance: true, preavisJours: 30, camera: false, actif: true },
  { code: 'pompe', libelle: 'Pompe de dépotage', avecEcheance: false, preavisJours: 30, camera: false, actif: true },
  { code: 'trousse_secours', libelle: 'Trousse de secours', avecEcheance: true, preavisJours: 30, camera: false, actif: true },
]
const CLE = 'fms-ucodis-types-equipements'

export const useTypesEquipementsStore = defineStore('typesEquipements', () => {
  const types = ref<TypeEquipementDef[]>(TYPES_EQUIPEMENTS_DEFAUT.map(t => ({ ...t })))
  try {
    const b = localStorage.getItem(CLE)
    if (b) {
      const lus = (JSON.parse(b) as Partial<TypeEquipementDef>[]).map(t => {
        const d = TYPES_EQUIPEMENTS_DEFAUT.find(x => x.code === t.code)
        return { ...t, preavisJours: t.preavisJours ?? d?.preavisJours ?? PREAVIS_EQUIPEMENT_DEFAUT, camera: t.camera ?? d?.camera ?? false } as TypeEquipementDef
      })
      types.value = [...lus, ...TYPES_EQUIPEMENTS_DEFAUT.filter(d => !lus.some(t => t.code === d.code)).map(t => ({ ...t }))]
    }
  } catch { /* défaut */ }
  watch(types, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  const get = (code: string) => types.value.find(t => t.code === code)
  const libelle = (code: string) => get(code)?.libelle || code
  /** Préavis d'alerte avant l'échéance d'un équipement de ce type, en jours. */
  const preavis = (code: string) => { const p = get(code)?.preavisJours; return typeof p === 'number' && Number.isFinite(p) && p >= 0 ? p : PREAVIS_EQUIPEMENT_DEFAUT }
  function ajouter(libelleSaisi: string, avecEcheance: boolean, camera = false, preavisJours = PREAVIS_EQUIPEMENT_DEFAUT): { ok: boolean; motif?: string } {
    const l = libelleSaisi.trim()
    if (!l) return { ok: false, motif: "Indiquez le libellé de l'équipement." }
    if (types.value.some(t => t.libelle.toLowerCase() === l.toLowerCase())) return { ok: false, motif: 'Ce type existe déjà.' }
    if (!Number.isFinite(preavisJours) || preavisJours < 0) return { ok: false, motif: 'Le préavis ne peut pas être négatif.' }
    const base = l.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    let code = base; let n = 2
    while (types.value.some(t => t.code === code)) code = `${base}_${n++}`
    types.value.push({ code, libelle: l, avecEcheance, preavisJours, camera, actif: true })
    return { ok: true }
  }
  return { types, get, libelle, preavis, ajouter }
})
