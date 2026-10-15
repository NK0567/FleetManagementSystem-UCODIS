import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/**
 * Types de sites (FMS-DB-14, PA-03) : paramétrables. Chaque type porte un
 * rayon de zone proposé à la création d'un site et une couleur sur la carte.
 */
export interface TypeSiteDef { libelle: string; rayonDefautM: number; couleur: string; actif: boolean }
export const TYPES_SITES_DEFAUT: TypeSiteDef[] = [
  { libelle: 'Base', rayonDefautM: 800, couleur: '#0B4480', actif: true },
  { libelle: 'Dépôt', rayonDefautM: 800, couleur: '#0B4480', actif: true },
  { libelle: 'Entrepôt client', rayonDefautM: 600, couleur: '#16a34a', actif: true },
  { libelle: 'Atelier', rayonDefautM: 400, couleur: '#ca8a04', actif: true },
  { libelle: 'Parking', rayonDefautM: 500, couleur: '#6b7280', actif: true },
  { libelle: 'Zone à risque', rayonDefautM: 3000, couleur: '#dc2626', actif: true },
  { libelle: 'Point de contrôle', rayonDefautM: 600, couleur: '#2563eb', actif: true },
  { libelle: 'Relais', rayonDefautM: 1000, couleur: '#ca8a04', actif: true },
]
const CLE = 'fms-ucodis-types-sites'

export const useTypesSitesStore = defineStore('typesSites', () => {
  const types = ref<TypeSiteDef[]>(TYPES_SITES_DEFAUT.map(t => ({ ...t })))
  try {
    const b = localStorage.getItem(CLE)
    if (b) { const lus = JSON.parse(b) as TypeSiteDef[]; types.value = [...lus, ...TYPES_SITES_DEFAUT.filter(d => !lus.some(t => t.libelle === d.libelle)).map(t => ({ ...t }))] }
  } catch { /* défaut */ }
  watch(types, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  const get = (libelle: string) => types.value.find(t => t.libelle === libelle)
  function ajouter(libelle: string, rayonDefautM: number): { ok: boolean; motif?: string } {
    const l = libelle.trim()
    if (!l) return { ok: false, motif: 'Indiquez le libellé du type de site.' }
    if (types.value.some(t => t.libelle.toLowerCase() === l.toLowerCase())) return { ok: false, motif: 'Ce type existe déjà.' }
    if (!Number.isFinite(rayonDefautM) || rayonDefautM < 50) return { ok: false, motif: 'Le rayon proposé est d’au moins 50 m.' }
    types.value.push({ libelle: l, rayonDefautM, couleur: '#0B4480', actif: true })
    return { ok: true }
  }
  return { types, get, ajouter }
})
