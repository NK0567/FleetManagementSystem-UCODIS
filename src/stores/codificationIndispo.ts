import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { CODES_INDISPO, type DefinitionIndispo, type FamilleIndispo } from '../types/maintenance'

/**
 * Codification des causes d'indisponibilité, renseignée par chaque
 * entreprise dans le paramétrage : les codes livrés ne sont qu'un point de
 * départ, modifiables, supprimables, et complétables.
 */
const CLE = 'fms-ucodis-codification-indispo'

export const useCodificationIndispoStore = defineStore('codificationIndispo', () => {
  let initial: DefinitionIndispo[] = CODES_INDISPO.map(c => ({ ...c }))
  try { const b = localStorage.getItem(CLE); if (b) initial = JSON.parse(b) } catch { /* défaut */ }
  const codes = ref<DefinitionIndispo[]>(initial)
  watch(codes, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })

  const familleDuCode = (c: string): FamilleIndispo => codes.value.find(x => x.code === c)?.famille ?? 'technique'
  const libelleDuCode = (c: string): string => codes.value.find(x => x.code === c)?.libelle ?? c

  function ajouter(d: DefinitionIndispo): { ok: boolean; motif?: string } {
    const code = d.code.trim().toUpperCase()
    if (!code || !d.libelle.trim()) return { ok: false, motif: 'Indiquez le code et son libellé.' }
    if (codes.value.some(x => x.code === code)) return { ok: false, motif: 'Ce code existe déjà.' }
    codes.value.push({ code, famille: d.famille, libelle: d.libelle.trim() })
    return { ok: true }
  }
  function modifier(code: string, data: Partial<Omit<DefinitionIndispo, 'code'>>) {
    const c = codes.value.find(x => x.code === code); if (c) Object.assign(c, data)
  }
  function supprimer(code: string) { codes.value = codes.value.filter(x => x.code !== code) }
  /** Revient aux codes proposés en gardant ceux déjà utilisés, pour ne
   *  pas rendre illisibles les immobilisations enregistrées. */
  function reinitialiser(codesUtilises: string[] = []) {
    const base = CODES_INDISPO.map(c => ({ ...c }))
    const gardes = codes.value.filter(c => codesUtilises.includes(c.code) && !base.some(b => b.code === c.code))
    codes.value = [...base, ...gardes]
  }
  return { codes, familleDuCode, libelleDuCode, ajouter, modifier, supprimer, reinitialiser }
})
