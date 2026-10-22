import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Voyage } from '../types'
import { useSitesStore } from './sites'
import { useUtilisateurStore } from './utilisateurs'

/**
 * Rattachement des utilisateurs à des dépôts et à des régions : chacun ne
 * voit que les expéditions qui en dépendent. Un utilisateur sans
 * rattachement voit tout.
 */
export interface Perimetre {
  /** Identifiants de sites (dépôts) du référentiel des sites. */
  depots: string[]
  /** Régions, telles que portées par les sites. */
  regions: string[]
}
export interface PerimetreVisible extends Perimetre { tout: boolean }
export interface Resultat { ok: boolean; motif?: string }
/** Lieu d'une expédition : site (identifiant ou nom), ville ou région. */
export interface LieuExpedition { siteId?: string; nom?: string; region?: string }

const DEFAUT = (): Record<string, Perimetre> => ({
  'u-006': { depots: ['site-001'], regions: [] },
})
const CLE = 'fms-ucodis-perimetres-utilisateurs'
const norm = (s?: string) => (s ?? '').trim().toLowerCase()

export const usePerimetresStore = defineStore('perimetres', () => {
  let initial = DEFAUT()
  try { const b = localStorage.getItem(CLE); if (b) { const lu = JSON.parse(b); if (lu && typeof lu === 'object') initial = lu } } catch { /* défaut */ }
  const perimetres = ref<Record<string, Perimetre>>(initial)
  watch(perimetres, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })

  const sites = () => useSitesStore()
  /** Régions connues, reprises du référentiel des sites. */
  const regionsConnues = computed(() => [...new Set(sites().sites.map(s => s.region?.trim()).filter((r): r is string => !!r))].sort((a, b) => a.localeCompare(b, 'fr')))

  /** Ce que voit un utilisateur : tout, ou seulement ses dépôts et ses régions. */
  function perimetreVisible(utilisateurId?: string | null): PerimetreVisible {
    const p = utilisateurId ? perimetres.value[utilisateurId] : undefined
    const depots = p?.depots ?? [], regions = p?.regions ?? []
    return { tout: !depots.length && !regions.length, depots: [...depots], regions: [...regions] }
  }

  function definir(utilisateurId: string, p: Perimetre): Resultat {
    if (!useUtilisateurStore().liste.some(u => u.id === utilisateurId)) return { ok: false, motif: 'Utilisateur introuvable.' }
    const depots = [...new Set(p.depots)], regions = [...new Set(p.regions.map(r => r.trim()).filter(Boolean))]
    if (depots.some(id => !sites().getById(id))) return { ok: false, motif: 'Dépôt introuvable dans le référentiel des sites.' }
    if (regions.some(r => !regionsConnues.value.some(x => norm(x) === norm(r)))) return { ok: false, motif: 'Région inconnue : elle doit être portée par au moins un site.' }
    if (!depots.length && !regions.length) { const { [utilisateurId]: _retire, ...reste } = perimetres.value; perimetres.value = reste }
    else perimetres.value = { ...perimetres.value, [utilisateurId]: { depots, regions } }
    return { ok: true }
  }
  function ajouterDepot(utilisateurId: string, siteId: string): Resultat {
    const p = perimetreVisible(utilisateurId)
    if (!siteId) return { ok: false, motif: 'Choisissez le dépôt.' }
    if (!sites().estDepot(sites().getById(siteId))) return { ok: false, motif: "Ce site n'est pas un dépôt de chargement : cochez « Dépôt de chargement » sur son type de site." }
    if (p.depots.includes(siteId)) return { ok: false, motif: 'Ce dépôt est déjà rattaché.' }
    return definir(utilisateurId, { depots: [...p.depots, siteId], regions: p.regions })
  }
  function ajouterRegion(utilisateurId: string, region: string): Resultat {
    const p = perimetreVisible(utilisateurId)
    if (!region.trim()) return { ok: false, motif: 'Choisissez la région.' }
    if (p.regions.some(r => norm(r) === norm(region))) return { ok: false, motif: 'Cette région est déjà rattachée.' }
    return definir(utilisateurId, { depots: p.depots, regions: [...p.regions, region] })
  }
  function retirer(utilisateurId: string, quoi: 'depot' | 'region', valeur: string): Resultat {
    const p = perimetreVisible(utilisateurId)
    return definir(utilisateurId, quoi === 'depot' ? { depots: p.depots.filter(d => d !== valeur), regions: p.regions } : { depots: p.depots, regions: p.regions.filter(r => norm(r) !== norm(valeur)) })
  }

  /** Un lieu est-il dans le périmètre de l'utilisateur ? Le site se retrouve par identifiant, nom ou ville. */
  function voitLieu(utilisateurId: string | null | undefined, lieu: LieuExpedition): boolean {
    const p = perimetreVisible(utilisateurId)
    if (p.tout) return true
    const s = (lieu.siteId ? sites().getById(lieu.siteId) : undefined)
      ?? sites().sites.find(x => norm(x.nom) === norm(lieu.nom))
      ?? sites().sites.find(x => norm(x.ville) === norm(lieu.nom))
    if (s && p.depots.includes(s.id)) return true
    const region = lieu.region ?? s?.region
    return !!region && p.regions.some(r => norm(r) === norm(region))
  }
  /** Une expédition est visible si son départ ou l'un de ses points en dépend. */
  function voitExpedition(utilisateurId: string | null | undefined, v: Pick<Voyage, 'origine' | 'etapes'>): boolean {
    if (perimetreVisible(utilisateurId).tout) return true
    if (voitLieu(utilisateurId, { nom: v.origine })) return true
    return v.etapes.some(e => voitLieu(utilisateurId, { siteId: e.siteId, nom: e.siteNom }))
  }

  function reinitialiser() { perimetres.value = DEFAUT() }

  return { perimetres, regionsConnues, perimetreVisible, definir, ajouterDepot, ajouterRegion, retirer, voitLieu, voitExpedition, reinitialiser }
})
