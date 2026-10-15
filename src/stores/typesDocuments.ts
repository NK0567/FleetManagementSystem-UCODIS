import { defineStore } from 'pinia'
import { ref, reactive, watch } from 'vue'

/**
 * Référentiel des types de documents (FMS-SC-01) : rien n'est figé dans le
 * code. Chaque entreprise déclare ses types, à qui ils s'appliquent (type de
 * véhicule, profil de personne), s'ils sont obligatoires, leur validité et
 * le délai de notification avant expiration, selon la réglementation de son pays.
 */
export type CibleDocument = 'vehicule' | 'personne' | 'entreprise'
export type ValiditeDocument = 'limitee' | 'illimitee'

export const LIB_CIBLE: Record<CibleDocument, string> = { vehicule: 'Véhicule', personne: 'Personne', entreprise: 'Entreprise' }
/** Sous-catégories auxquelles un type peut s'appliquer ; vide : à toutes. */
export const SOUS_CIBLES: Record<CibleDocument, { id: string; label: string }[]> = {
  vehicule: [{ id: 'tracteur', label: 'Tracteur' }, { id: 'semi_remorque', label: 'Semi-remorque' }],
  personne: [{ id: 'roulant', label: 'Personnel roulant' }, { id: 'sedentaire', label: 'Personnel sédentaire' }],
  entreprise: [],
}

export interface TypeDocumentDef {
  code: string
  libelle: string
  cible: CibleDocument
  appliqueA: string[]
  obligatoire: boolean
  validite: ValiditeDocument
  /** Durée habituelle, pour proposer une date de fin à la saisie. */
  dureeMois?: number
  delaiNotificationJours: number
  actif: boolean
}

const DEFAUT: TypeDocumentDef[] = [
  { code: 'carte_grise', libelle: 'Carte grise', cible: 'vehicule', appliqueA: [], obligatoire: true, validite: 'illimitee', delaiNotificationJours: 0, actif: true },
  { code: 'assurance', libelle: 'Assurance véhicule', cible: 'vehicule', appliqueA: [], obligatoire: true, validite: 'limitee', dureeMois: 12, delaiNotificationJours: 30, actif: true },
  { code: 'visite_technique', libelle: 'Visite technique', cible: 'vehicule', appliqueA: [], obligatoire: true, validite: 'limitee', dureeMois: 6, delaiNotificationJours: 30, actif: true },
  { code: 'vignette', libelle: 'Vignette', cible: 'vehicule', appliqueA: ['tracteur'], obligatoire: true, validite: 'limitee', dureeMois: 12, delaiNotificationJours: 30, actif: true },
  { code: 'carte_fiscale', libelle: 'Carte fiscale', cible: 'vehicule', appliqueA: ['tracteur'], obligatoire: false, validite: 'limitee', dureeMois: 12, delaiNotificationJours: 30, actif: true },
  { code: 'permis', libelle: 'Permis de conduire', cible: 'personne', appliqueA: ['roulant'], obligatoire: true, validite: 'limitee', dureeMois: 120, delaiNotificationJours: 60, actif: true },
  { code: 'visite_medicale', libelle: 'Visite médicale', cible: 'personne', appliqueA: ['roulant'], obligatoire: true, validite: 'limitee', dureeMois: 12, delaiNotificationJours: 30, actif: true },
  { code: 'cin', libelle: "Carte d'identité nationale", cible: 'personne', appliqueA: [], obligatoire: true, validite: 'illimitee', delaiNotificationJours: 0, actif: true },
  { code: 'contrat', libelle: 'Contrat de travail', cible: 'personne', appliqueA: [], obligatoire: true, validite: 'illimitee', delaiNotificationJours: 0, actif: true },
  { code: 'formation', libelle: 'Attestation de formation', cible: 'personne', appliqueA: [], obligatoire: false, validite: 'illimitee', delaiNotificationJours: 0, actif: true },
  { code: 'certification', libelle: 'Certification', cible: 'personne', appliqueA: [], obligatoire: false, validite: 'limitee', dureeMois: 24, delaiNotificationJours: 30, actif: true },
  { code: 'statuts', libelle: 'Statuts de la société', cible: 'entreprise', appliqueA: [], obligatoire: true, validite: 'illimitee', delaiNotificationJours: 0, actif: true },
  { code: 'licence_transport', libelle: 'Licence de transport', cible: 'entreprise', appliqueA: [], obligatoire: true, validite: 'limitee', dureeMois: 12, delaiNotificationJours: 60, actif: true },
  { code: 'attestation_fiscale', libelle: 'Attestation de régularité fiscale', cible: 'entreprise', appliqueA: [], obligatoire: false, validite: 'limitee', dureeMois: 12, delaiNotificationJours: 30, actif: true },
  { code: 'procedure', libelle: 'Procédure interne', cible: 'entreprise', appliqueA: [], obligatoire: false, validite: 'illimitee', delaiNotificationJours: 0, actif: true },
]

/** Libellés par code, partagés avec les écrans qui affichent un type (réactifs). */
export const LIBELLES_TYPES_DOCUMENTS = reactive<Record<string, string>>({})

const CLE = 'fms-ucodis-types-documents'

export const useTypesDocumentsStore = defineStore('typesDocuments', () => {
  let initial = DEFAUT.map(t => ({ ...t, appliqueA: [...t.appliqueA] }))
  try {
    const b = localStorage.getItem(CLE)
    if (b) {
      const enregistres = JSON.parse(b) as TypeDocumentDef[]
      initial = [...enregistres, ...initial.filter(d => !enregistres.some(e => e.code === d.code))]
    }
  } catch { /* défaut */ }
  const types = ref<TypeDocumentDef[]>(initial)
  const synchroniser = () => {
    Object.keys(LIBELLES_TYPES_DOCUMENTS).forEach(k => delete LIBELLES_TYPES_DOCUMENTS[k])
    types.value.forEach(t => { LIBELLES_TYPES_DOCUMENTS[t.code] = t.libelle })
  }
  synchroniser()
  watch(types, v => { synchroniser(); try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  const get = (code: string) => types.value.find(t => t.code === code)
  const libelle = (code: string) => get(code)?.libelle ?? code
  const deCible = (cible: CibleDocument) => types.value.filter(t => t.cible === cible && t.actif)
  /** Types applicables à une sous-catégorie (type de véhicule, profil de personne). */
  const applicables = (cible: CibleDocument, sousCible: string) => deCible(cible).filter(t => !t.appliqueA.length || t.appliqueA.includes(sousCible))
  const obligatoires = (cible: CibleDocument, sousCible: string) => applicables(cible, sousCible).filter(t => t.obligatoire)

  function ajouter(t: Omit<TypeDocumentDef, 'code' | 'actif'> & { code?: string }): { ok: boolean; motif?: string } {
    const libelleT = t.libelle.trim()
    if (!libelleT) return { ok: false, motif: 'Indiquez le libellé.' }
    if (types.value.some(x => x.cible === t.cible && x.libelle.toLowerCase() === libelleT.toLowerCase())) return { ok: false, motif: 'Ce type existe déjà.' }
    if (t.validite === 'limitee' && t.delaiNotificationJours < 0) return { ok: false, motif: 'Le délai de notification ne peut pas être négatif.' }
    const base = (t.code ?? libelleT).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    let code = base || 'type'; let n = 2
    while (types.value.some(x => x.code === code)) code = `${base}_${n++}`
    types.value.push({ ...t, libelle: libelleT, code, actif: true, appliqueA: [...t.appliqueA] })
    return { ok: true }
  }
  function modifier(code: string, data: Partial<Omit<TypeDocumentDef, 'code' | 'cible'>>) {
    const t = get(code); if (t) Object.assign(t, data)
  }
  function reinitialiser() { types.value = DEFAUT.map(t => ({ ...t, appliqueA: [...t.appliqueA] })) }

  return { types, get, libelle, deCible, applicables, obligatoires, ajouter, modifier, reinitialiser }
})
