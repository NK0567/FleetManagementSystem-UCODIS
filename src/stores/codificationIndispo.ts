import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { CODES_INDISPO, type DefinitionIndispo, type FamilleIndispo } from '../types/maintenance'

/**
 * Codification des causes d'indisponibilité, renseignée par chaque
 * entreprise dans le paramétrage : les codes livrés ne sont qu'un point de
 * départ, modifiables, supprimables, et complétables.
 */
const CLE = 'fms-ucodis-codification-indispo-v2'

export const useCodificationIndispoStore = defineStore('codificationIndispo', () => {
  let initial: DefinitionIndispo[] = CODES_INDISPO.map(c => ({ ...c }))
  try { const b = localStorage.getItem(CLE); if (b) initial = JSON.parse(b) } catch { /* défaut */ }
  const codes = ref<DefinitionIndispo[]>(initial)
  watch(codes, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })

  /** Codes posés automatiquement par le système : à l'ouverture d'un
   *  ordre préventif, d'un ordre correctif et d'une réparation après accident,
   *  et cause affichée pour un véhicule hors service, un entretien dépassé
   *  ou une inspection périodique non conforme.
   *  Le code d'un document expiré se règle avec les règles documentaires. */
  const codesAuto = ref<{ preventif: string; correctif: string; accident: string; horsService: string; entretienDepasse: string; inspectionNonConforme: string }>({ preventif: 'MTN', correctif: 'PNN', accident: 'ACC', horsService: 'PNN', entretienDepasse: 'EDP', inspectionNonConforme: 'CTV' })
  try { const b = localStorage.getItem(CLE + '-auto'); if (b) Object.assign(codesAuto.value, JSON.parse(b)) } catch { /* défaut */ }
  /* Codes posés automatiquement ajoutés depuis : complétés dans une codification déjà enregistrée. */
  Object.values(codesAuto.value).forEach(c => {
    const def = CODES_INDISPO.find(x => x.code === c)
    if (def && !codes.value.some(x => x.code === c)) codes.value.push({ ...def })
  })
  watch(codesAuto, v => { try { localStorage.setItem(CLE + '-auto', JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  /** Code automatique s'il existe encore dans la codification, sinon le premier code technique. */
  const codeAuto = (k: 'preventif' | 'correctif' | 'accident' | 'horsService' | 'entretienDepasse' | 'inspectionNonConforme') =>
    codes.value.some(x => x.code === codesAuto.value[k]) ? codesAuto.value[k] : codes.value.find(x => x.famille === 'technique')?.code ?? codes.value[0]?.code ?? ''

  const familleDuCode = (c: string): FamilleIndispo => codes.value.find(x => x.code === c)?.famille ?? 'technique'
  const libelleDuCode = (c: string): string => codes.value.find(x => x.code === c)?.libelle ?? c

  function ajouter(d: DefinitionIndispo): { ok: boolean; motif?: string } {
    const code = d.code.trim().toUpperCase()
    if (!code || !d.libelle.trim()) return { ok: false, motif: 'Indiquez le code et son libellé.' }
    if (codes.value.some(x => x.code === code)) return { ok: false, motif: 'Ce code existe déjà.' }
    codes.value.push({ code, famille: d.famille, libelle: d.libelle.trim() })
    return { ok: true }
  }
  function modifier(code: string, data: Partial<Omit<DefinitionIndispo, 'code'>>): { ok: boolean; motif?: string } {
    const c = codes.value.find(x => x.code === code); if (!c) return { ok: false, motif: 'Cause introuvable.' }
    if (data.libelle !== undefined && !data.libelle.trim()) return { ok: false, motif: 'Le libellé de la cause ne peut pas être vide.' }
    Object.assign(c, data.libelle !== undefined ? { ...data, libelle: data.libelle.trim() } : data)
    return { ok: true }
  }
  /** Une cause posée automatiquement ou qui qualifie déjà une indisponibilité ne se supprime pas. */
  function supprimer(code: string, d: { utilisations?: number; protege?: boolean } = {}): { ok: boolean; motif?: string } {
    if (d.protege || Object.values(codesAuto.value).includes(code))
      return { ok: false, motif: `La cause ${code} est posée automatiquement : choisissez-en une autre avant de la supprimer.` }
    if (d.utilisations) return { ok: false, motif: `La cause ${code} qualifie ${d.utilisations} indisponibilité(s) enregistrée(s) : modifiez plutôt son libellé.` }
    codes.value = codes.value.filter(x => x.code !== code)
    return { ok: true }
  }
  /** Revient aux codes proposés en gardant ceux déjà utilisés, pour ne
   *  pas rendre illisibles les immobilisations enregistrées. */
  function reinitialiser(codesUtilises: string[] = []) {
    const base = CODES_INDISPO.map(c => ({ ...c }))
    const gardes = codes.value.filter(c => codesUtilises.includes(c.code) && !base.some(b => b.code === c.code))
    codes.value = [...base, ...gardes]
  }
  return { codes, codesAuto, codeAuto, familleDuCode, libelleDuCode, ajouter, modifier, supprimer, reinitialiser }
})
