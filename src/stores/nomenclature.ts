import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { LIB_SYSTEME, LIB_SOUS_SYSTEME, LIB_MODE_DEFAILLANCE, LIB_CAUSE_RACINE, SYSTEME_PAR_SOUS_SYSTEME } from '../types/maintenance'
import { useMaintenanceStore } from './maintenance'

/**
 * Nomenclature de diagnostic des pannes : systèmes, sous-systèmes (chacun
 * rattaché à un système), modes de défaillance et causes racines. Chaque
 * entreprise la tient elle-même ; la liste de départ suit la norme
 * ISO 14224. Un élément déjà utilisé ne se supprime pas, il se désactive :
 * il garde son libellé dans l'historique mais n'est plus proposé.
 */
export type ListeNomenclature = 'systemes' | 'sousSystemes' | 'modes' | 'causes'
export interface ElementNomenclature { code: string; libelle: string; actif: boolean; systeme?: string }

export const LIB_LISTE_NOMENCLATURE: Record<ListeNomenclature, string> = {
  systemes: 'Systèmes',
  sousSystemes: 'Sous-systèmes',
  modes: 'Modes de défaillance',
  causes: 'Causes racines',
}

const SOURCES: Record<ListeNomenclature, Record<string, string>> = {
  systemes: LIB_SYSTEME, sousSystemes: LIB_SOUS_SYSTEME, modes: LIB_MODE_DEFAILLANCE, causes: LIB_CAUSE_RACINE,
}
const depart = (l: ListeNomenclature): ElementNomenclature[] =>
  Object.entries(SOURCES[l]).map(([code, libelle]) => ({ code, libelle, actif: true, ...(l === 'sousSystemes' ? { systeme: SYSTEME_PAR_SOUS_SYSTEME[code] } : {}) }))
const DEPART: Record<ListeNomenclature, ElementNomenclature[]> = {
  systemes: depart('systemes'), sousSystemes: depart('sousSystemes'), modes: depart('modes'), causes: depart('causes'),
}
const CLE = 'fms-ucodis-nomenclature'

const sansAccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const useNomenclatureStore = defineStore('nomenclature', () => {
  const listes = ref<Record<ListeNomenclature, ElementNomenclature[]>>(JSON.parse(JSON.stringify(DEPART)))
  try { const b = localStorage.getItem(CLE); if (b) Object.assign(listes.value, JSON.parse(b)) } catch { /* départ */ }
  /* Un sous-système enregistré avant l'ajout du niveau système est rattaché à son système de départ. */
  listes.value.sousSystemes.forEach(e => {
    if (!e.systeme || !listes.value.systemes.some(x => x.code === e.systeme))
      e.systeme = SYSTEME_PAR_SOUS_SYSTEME[e.code] ?? listes.value.systemes[0]?.code
  })
  watch(listes, v => {
    try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* ignoré */ }
    ;(Object.keys(v) as ListeNomenclature[]).forEach(l => v[l].forEach(e => { if (e.libelle.trim()) SOURCES[l][e.code] = e.libelle.trim() }))
  }, { deep: true, immediate: true })

  const options = (l: ListeNomenclature) => listes.value[l].filter(e => e.actif).map(e => ({ id: e.code, label: e.libelle }))
  const optSousSystemes = computed(() => options('sousSystemes'))
  const optModes = computed(() => options('modes'))
  const optCauses = computed(() => options('causes'))

  /** Système d'un sous-système, et son libellé. */
  const systemeDe = (sousSysteme?: string) => listes.value.sousSystemes.find(e => e.code === sousSysteme)?.systeme
  const libelleSysteme = (sousSysteme?: string) => {
    const c = systemeDe(sousSysteme)
    return c ? (listes.value.systemes.find(e => e.code === c)?.libelle ?? c) : undefined
  }
  const optSystemes = computed(() => options('systemes'))

  /** Rattache un sous-système à un système actif. */
  function rattacher(sousSysteme: string, systeme: string): { ok: boolean; motif?: string } {
    const e = listes.value.sousSystemes.find(x => x.code === sousSysteme)
    if (!e) return { ok: false, motif: 'Sous-système introuvable.' }
    if (!listes.value.systemes.some(x => x.code === systeme && x.actif)) return { ok: false, motif: 'Choisissez un système actif.' }
    e.systeme = systeme
    return { ok: true }
  }
  /** Libellé modifié : un libellé vide est refusé. */
  function renommer(l: ListeNomenclature, code: string, libelle: string): { ok: boolean; motif?: string } {
    const e = listes.value[l].find(x => x.code === code)
    if (!e) return { ok: false, motif: 'Élément introuvable.' }
    const lib = libelle.trim()
    if (!lib) return { ok: false, motif: 'Le libellé ne peut pas être vide.' }
    if (listes.value[l].some(x => x.code !== code && sansAccent(x.libelle) === sansAccent(lib))) return { ok: false, motif: `« ${lib} » existe déjà.` }
    e.libelle = lib
    return { ok: true }
  }

  /** Nombre d'usages d'un code : un code utilisé ne se supprime pas. Un
   *  système est utilisé par les sous-systèmes qui lui sont rattachés. */
  function utilisations(l: ListeNomenclature, code: string): number {
    if (l === 'systemes') return listes.value.sousSystemes.filter(e => e.systeme === code).length
    const m = useMaintenanceStore()
    const champ = l === 'sousSystemes' ? 'sousSysteme' : l === 'modes' ? 'modeDefaillance' : 'causeRacine'
    const ot = m.ordres.filter(o => (o as unknown as Record<string, unknown>)[champ] === code).length
    const plans = l === 'sousSystemes' ? m.plans.reduce((s, p) => s + p.operations.filter(op => op.sousSysteme === code).length, 0) : 0
    return ot + plans
  }

  function ajouter(l: ListeNomenclature, libelle: string, systeme?: string): { ok: boolean; motif?: string } {
    const lib = libelle.trim()
    if (!lib) return { ok: false, motif: 'Indiquez un libellé.' }
    if (l === 'sousSystemes' && !listes.value.systemes.some(x => x.code === systeme && x.actif)) return { ok: false, motif: 'Choisissez le système de ce sous-système.' }
    if (listes.value[l].some(e => sansAccent(e.libelle) === sansAccent(lib))) return { ok: false, motif: `« ${lib} » existe déjà.` }
    let code = sansAccent(lib).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'element'
    let n = 2
    while (listes.value[l].some(e => e.code === code)) code = `${code.replace(/_\d+$/, '')}_${n++}`
    listes.value[l].push({ code, libelle: lib, actif: true, ...(l === 'sousSystemes' ? { systeme } : {}) })
    if (l === 'sousSystemes') {
      const m = useMaintenanceStore()
      if (!m.competenceParSousSysteme[code] && m.competences[0]) m.competenceParSousSysteme[code] = m.competences[0].code
    }
    return { ok: true }
  }

  function supprimer(l: ListeNomenclature, code: string): { ok: boolean; motif?: string } {
    const n = utilisations(l, code)
    if (n) return { ok: false, motif: `Ce code est utilisé ${n} fois : désactivez-le plutôt.` }
    if (listes.value[l].filter(e => e.actif).length <= 1) return { ok: false, motif: 'Gardez au moins un élément actif.' }
    listes.value[l] = listes.value[l].filter(e => e.code !== code)
    return { ok: true }
  }

  function basculer(l: ListeNomenclature, code: string): { ok: boolean; motif?: string } {
    const e = listes.value[l].find(x => x.code === code)
    if (!e) return { ok: false, motif: 'Élément introuvable.' }
    if (e.actif && listes.value[l].filter(x => x.actif).length <= 1) return { ok: false, motif: 'Gardez au moins un élément actif.' }
    if (e.actif && l === 'systemes' && listes.value.sousSystemes.some(x => x.actif && x.systeme === code))
      return { ok: false, motif: 'Des sous-systèmes actifs sont rattachés à ce système : rattachez-les ailleurs d\'abord.' }
    e.actif = !e.actif
    return { ok: true }
  }

  function reinitialiser(l: ListeNomenclature) {
    const gardes = listes.value[l].filter(e => !DEPART[l].some(d => d.code === e.code) && utilisations(l, e.code))
    listes.value[l] = [...JSON.parse(JSON.stringify(DEPART[l])), ...gardes.map(e => ({ ...e, actif: false }))]
    if (l === 'systemes') listes.value.sousSystemes.forEach(e => {
      if (!listes.value.systemes.some(x => x.code === e.systeme)) e.systeme = SYSTEME_PAR_SOUS_SYSTEME[e.code] ?? listes.value.systemes[0]?.code
    })
  }

  return { listes, optSystemes, optSousSystemes, optModes, optCauses, systemeDe, libelleSysteme, rattacher, renommer, utilisations, ajouter, supprimer, basculer, reinitialiser }
})
