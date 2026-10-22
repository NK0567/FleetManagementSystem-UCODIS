import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useVehiculeStore } from './vehicules'

/**
 * Types de véhicules (FMS-PA-01) : ils se définissent dans les paramètres,
 * sans développement. Le tracteur, la semi-remorque et la citerne sont
 * proposés au départ. Pour chaque type on précise s'il est motorisé, son
 * rôle dans un attelage, s'il porte la marchandise et s'il a des
 * compartiments.
 */
export type RoleAttelage = 'tracte' | 'est_tracte' | 'aucun'
export interface TypeVehiculeDef {
  code: string
  libelle: string
  motorise: boolean
  attelage: RoleAttelage
  porteMarchandise: boolean
  compartiments: boolean
  actif: boolean
}
export const LIB_ROLE_ATTELAGE: Record<RoleAttelage, string> = {
  tracte: 'Tire une remorque', est_tracte: 'Est attelé à un tracteur', aucun: "Ne s'attelle pas",
}
export const TYPES_VEHICULES_DEFAUT: TypeVehiculeDef[] = [
  { code: 'tracteur', libelle: 'Tracteur', motorise: true, attelage: 'tracte', porteMarchandise: false, compartiments: false, actif: true },
  { code: 'semi_remorque', libelle: 'Semi-remorque', motorise: false, attelage: 'est_tracte', porteMarchandise: true, compartiments: false, actif: true },
  { code: 'citerne', libelle: 'Citerne', motorise: false, attelage: 'est_tracte', porteMarchandise: true, compartiments: true, actif: true },
  { code: 'remorque', libelle: 'Remorque', motorise: false, attelage: 'est_tracte', porteMarchandise: true, compartiments: false, actif: true },
]
const CLE = 'fms-ucodis-types-vehicules'

export const useTypesVehiculesStore = defineStore('typesVehicules', () => {
  const types = ref<TypeVehiculeDef[]>(TYPES_VEHICULES_DEFAUT.map(t => ({ ...t })))
  try {
    const b = localStorage.getItem(CLE)
    if (b) { const lus = JSON.parse(b) as TypeVehiculeDef[]; types.value = [...lus, ...TYPES_VEHICULES_DEFAUT.filter(d => !lus.some(t => t.code === d.code)).map(t => ({ ...t }))] }
  } catch { /* défaut */ }
  watch(types, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  const get = (code: string) => types.value.find(t => t.code === code)
  const libelle = (code: string) => get(code)?.libelle || code
  const estMotorise = (code: string) => get(code)?.motorise ?? code === 'tracteur'
  const estTracte = (code: string) => (get(code)?.attelage ?? (code === 'tracteur' ? 'tracte' : 'est_tracte')) === 'est_tracte'
  const aCompartiments = (code: string) => !!get(code)?.compartiments

  /** Contrôles communs à l'ajout et à la modification d'un type. */
  function controler(d: Omit<TypeVehiculeDef, 'code' | 'actif'>, code?: string): string | null {
    const l = d.libelle.trim()
    if (!l) return 'Indiquez le libellé du type.'
    if (types.value.some(t => t.code !== code && t.libelle.trim().toLowerCase() === l.toLowerCase())) return 'Ce type existe déjà.'
    if (d.motorise && d.attelage === 'est_tracte') return 'Un véhicule motorisé ne peut pas être tracté.'
    if (!d.motorise && d.attelage === 'tracte') return 'Un véhicule sans moteur ne peut pas tirer une remorque.'
    if (d.compartiments && !d.porteMarchandise) return 'Seul un véhicule qui porte la marchandise a des compartiments.'
    return null
  }

  function ajouter(d: Omit<TypeVehiculeDef, 'code' | 'actif'>): { ok: boolean; motif?: string } {
    const erreur = controler(d)
    if (erreur) return { ok: false, motif: erreur }
    const l = d.libelle.trim()
    const base = l.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    let code = base; let n = 2
    while (types.value.some(t => t.code === code)) code = `${base}_${n++}`
    types.value.push({ ...d, libelle: l, code, actif: true })
    return { ok: true }
  }
  /**
   * Les propriétés d'un type (motorisé, attelage, marchandise, compartiments)
   * se modifient tant qu'aucun véhicule ne l'utilise, avec les mêmes
   * contrôles que l'ajout.
   */
  function modifier(code: string, d: Omit<TypeVehiculeDef, 'code' | 'actif'>): { ok: boolean; motif?: string } {
    const t = get(code)
    if (!t) return { ok: false, motif: 'Type introuvable.' }
    const n = useVehiculeStore().liste.filter(v => v.type === code).length
    const proprietesChangent = t.motorise !== d.motorise || t.attelage !== d.attelage || t.porteMarchandise !== d.porteMarchandise || t.compartiments !== d.compartiments
    if (n && proprietesChangent) return { ok: false, motif: `${n} véhicule(s) utilisent ce type : ses propriétés ne se modifient plus.` }
    const erreur = controler(d, code)
    if (erreur) return { ok: false, motif: erreur }
    Object.assign(t, { ...d, libelle: d.libelle.trim() })
    return { ok: true }
  }
  return { types, get, libelle, estMotorise, estTracte, aCompartiments, ajouter, modifier }
})
