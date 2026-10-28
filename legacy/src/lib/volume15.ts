/**
 * Volume de carburant ramené à 15 °C.
 *
 * La valeur saisie du BSL (chargement) ou du relevé de dépotage (livraison)
 * fait foi. À défaut, quand le volume et la température sont saisis, le
 * volume à 15 °C se calcule avec la méthode réglée par l'entreprise. Chaque
 * méthode est une fonction de METHODES_VOLUME15 : une nouvelle méthode (par
 * exemple une table officielle fournie par le client) s'y ajoute sans
 * toucher au reste. Les plages de contrôle n'arrêtent qu'une faute de frappe.
 */
import type { MesureCompartiment } from '../types'

/* ── Méthodes de calcul du volume à 15 °C ── */
export type MethodeVolume15 = 'coefficient' | 'saisie'
/** Ce qu'une méthode sait du produit : son coefficient de dilatation (par degré). */
export interface ProduitPourCalcul { nom: string; coefficientDilatation?: number }
/** Résultat d'un calcul : la valeur, ou la raison pour laquelle il n'y a pas de calcul. */
export type CalculVolume15 = { valeur: number } | { raison: string } | null
export interface MethodeCalcul15 {
  libelle: string
  /** null : la méthode ne calcule rien (la valeur se saisit). */
  calculer: ((volumeL: number, temperature: number, produit?: ProduitPourCalcul) => CalculVolume15) | null
}
/** Bornes d'un coefficient de dilatation raisonnable, par degré. */
export const COEFFICIENT_MIN = 0.0001
export const COEFFICIENT_MAX = 0.005
export const MOTIF_COEFFICIENT_ABSENT = 'coefficient non renseigné'
export const METHODES_VOLUME15: Record<MethodeVolume15, MethodeCalcul15> = {
  /** V15 = V × (1 − a × (T − 15)), a étant le coefficient de dilatation du produit. */
  coefficient: {
    libelle: 'Coefficient de dilatation par produit',
    calculer: (volumeL, temperature, produit) => {
      const a = produit?.coefficientDilatation
      if (a == null || !Number.isFinite(a) || a <= 0) return { raison: MOTIF_COEFFICIENT_ABSENT }
      return { valeur: Math.round(volumeL * (1 - a * (temperature - 15))) }
    },
  },
  saisie: { libelle: 'Saisie seule (aucun calcul)', calculer: null },
}
export const METHODE_VOLUME15_DEFAUT: MethodeVolume15 = 'coefficient'
/** Calcul du volume à 15 °C avec la méthode réglée ; null si la méthode ne calcule rien ou s'il manque le volume ou la température. */
export function calculerVolume15(methode: MethodeVolume15, volumeL: unknown, temperature: unknown, produit?: ProduitPourCalcul): CalculVolume15 {
  const m = METHODES_VOLUME15[methode] ?? METHODES_VOLUME15[METHODE_VOLUME15_DEFAUT]
  if (!m.calculer || !nombre(volumeL) || !nombre(temperature) || volumeL <= 0) return null
  return m.calculer(volumeL, temperature, produit)
}
/** Volume à 15 °C retenu : la valeur saisie fait foi ; à défaut, la valeur calculée, marquée comme telle. */
export function completerVolume15(m: MesureCompartiment, methode: MethodeVolume15, produit?: ProduitPourCalcul): MesureCompartiment {
  if (nombre(m.volume15)) return { ...m, volume15Calcule: undefined }
  const r = calculerVolume15(methode, m.volumeL, m.temperature, produit)
  return r && 'valeur' in r ? { ...m, volume15: r.valeur, volume15Calcule: true } : { ...m, volume15Calcule: undefined }
}
/** Mention discrète de l'origine du volume à 15 °C : « calculé » ou « saisi ». */
export const origineVolume15 = (m?: Partial<MesureCompartiment> | null) => m?.volume15 == null ? '' : m.volume15Calcule ? 'calculé' : 'saisi'

const nombre = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const saisi = (x: unknown) => x != null && (x as unknown) !== ''

/** Contrôle des seules mesures saisies (volume, température, densité, volume à 15 °C) ; renvoie le motif d'un refus, ou null. */
export function controlerMesuresSaisies(m: Partial<MesureCompartiment>, libelle: string): string | null {
  if (saisi(m.volumeL)) {
    if (!nombre(m.volumeL)) return `${libelle} : le volume s'écrit en chiffres.`
    if (m.volumeL <= 0) return `${libelle} : le volume doit être positif.`
  }
  if (saisi(m.temperature)) {
    if (!nombre(m.temperature)) return `${libelle} : la température s'écrit en chiffres.`
    if (m.temperature < -20 || m.temperature > 60) return `${libelle} : la température va de -20 à 60 °C.`
  }
  if (saisi(m.densite)) {
    if (!nombre(m.densite)) return `${libelle} : la densité s'écrit en chiffres.`
    if (m.densite < 0.6 || m.densite > 1.1) return `${libelle} : la densité s'exprime en kg par litre (par exemple 0,845).`
  }
  if (saisi(m.volume15)) {
    if (!nombre(m.volume15)) return `${libelle} : le volume à 15 °C s'écrit en chiffres.`
    if (m.volume15 <= 0) return `${libelle} : le volume à 15 °C doit être positif.`
  }
  return null
}

/** Contrôle d'une mesure complète (volume, température, densité et volume à 15 °C exigés) ; renvoie le motif d'un refus, ou null. */
export function controlerMesure(m: Partial<MesureCompartiment>, libelle: string): string | null {
  if (!nombre(m.volumeL)) return `${libelle} : indiquez le volume.`
  if (m.volumeL <= 0) return `${libelle} : le volume doit être positif.`
  if (!nombre(m.temperature)) return `${libelle} : indiquez la température.`
  if (!nombre(m.densite)) return `${libelle} : indiquez la densité.`
  if (!nombre(m.volume15)) return `${libelle} : indiquez le volume à 15 °C.`
  return controlerMesuresSaisies(m, libelle)
}

/** Garde les seules mesures saisies d'un compartiment. */
export function mesuresSaisies(m: Partial<MesureCompartiment>, numero: number): MesureCompartiment {
  const out: MesureCompartiment = { numero }
  if (nombre(m.volumeL)) out.volumeL = m.volumeL
  if (nombre(m.temperature)) out.temperature = m.temperature
  if (nombre(m.densite)) out.densite = m.densite
  if (nombre(m.volume15)) out.volume15 = m.volume15
  return out
}

/** Somme des volumes à 15 °C saisis. */
export const totalA15 = (mesures: { volume15?: number }[]) => mesures.reduce((s, m) => s + (m.volume15 ?? 0), 0)
/** Somme des volumes saisis. */
export const totalVolume = (mesures: { volumeL?: number }[]) => mesures.reduce((s, m) => s + (m.volumeL ?? 0), 0)
/** Litres lisibles : « 12 000 L ». */
export const fmtL = (n?: number | null) => n == null ? '-' : `${Math.round(n).toLocaleString('fr-FR')} L`
/** Nombre lisible ou tiret. */
export const fmtNombre = (n?: number | null, suffixe = '') => n == null ? '-' : `${n.toLocaleString('fr-FR')}${suffixe}`
/** Mesures saisies d'un compartiment, en clair : « 12 000 L, 28 °C, densité 0,845, 11 875 L à 15 °C ». */
export function libelleMesure(m: Partial<MesureCompartiment>, apresVolume = ''): string {
  const parts: string[] = []
  if (m.volumeL != null) parts.push(`${fmtL(m.volumeL)}${apresVolume}`)
  if (m.temperature != null) parts.push(`${m.temperature.toLocaleString('fr-FR')} °C`)
  if (m.densite != null) parts.push(`densité ${m.densite.toLocaleString('fr-FR')}`)
  if (m.volume15 != null) parts.push(`${fmtL(m.volume15)} à 15 °C (${origineVolume15(m)})`)
  return parts.join(', ') || 'mesures non saisies'
}
