/**
 * File d'attente hors réseau, partagée par les saisies faites sur le
 * terrain (même principe que la checklist sur route) : sans réseau, la
 * saisie est gardée dans le navigateur de l'appareil, puis transmise
 * d'elle-même dès que la connexion revient, sans que l'utilisateur ait à
 * recommencer.
 *
 * Une même saisie (même clé) n'est jamais gardée deux fois. À la
 * transmission, ce qui s'est passé entre-temps est respecté : déjà faite,
 * elle est simplement oubliée ; devenue impossible (ligne refusée,
 * annulée...), elle devient un conflit dont le motif s'affiche à l'écran.
 */
import { ref, watch, type Ref } from 'vue'
import { maintenant } from '../utils/horloge'
import { useVoyagesStore } from '../stores/voyages'
import type { MesureCompartiment } from '../types'

export interface SaisieEnAttente<T> { cle: string; libelle: string; donnees: T; enregistreLe: string }
export interface ConflitTransmission { cle: string; libelle: string; motif: string; le: string }
export interface ResultatTraitement { ok: boolean; motif?: string; dejaFait?: boolean; conflit?: boolean }

export interface FileHorsReseau<T> {
  enLigne: Ref<boolean>
  file: Ref<SaisieEnAttente<T>[]>
  conflits: Ref<ConflitTransmission[]>
  enAttente: (cle: string) => SaisieEnAttente<T> | undefined
  conflit: (cle: string) => ConflitTransmission | undefined
  /** Avec le réseau, la saisie est transmise tout de suite ; sans réseau, elle attend. */
  soumettre: (cle: string, donnees: T, libelle: string) => { ok: boolean; motif?: string; horsLigne?: boolean }
  synchroniser: () => number
  oublierConflit: (cle: string) => void
}

const reseau = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const files = new Map<string, FileHorsReseau<unknown>>()

function lire<V>(cle: string, defaut: V): V {
  try { const b = localStorage.getItem(cle); return b ? JSON.parse(b) as V : defaut } catch { return defaut }
}

/** Une seule file par clé de stockage, quel que soit le nombre d'écrans qui l'utilisent. */
export function creerFileHorsReseau<T>(cleStockage: string, traiter: (donnees: T, enregistreLe: string) => ResultatTraitement): FileHorsReseau<T> {
  const existante = files.get(cleStockage)
  if (existante) return existante as FileHorsReseau<T>

  const file = ref<SaisieEnAttente<T>[]>(lire(cleStockage, [])) as Ref<SaisieEnAttente<T>[]>
  const conflits = ref<ConflitTransmission[]>(lire(`${cleStockage}-conflits`, []))
  watch(file, v => { try { localStorage.setItem(cleStockage, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  watch(conflits, v => { try { localStorage.setItem(`${cleStockage}-conflits`, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  const enAttente = (cle: string) => file.value.find(s => s.cle === cle)
  const conflit = (cle: string) => conflits.value.find(c => c.cle === cle)
  function noterConflit(cle: string, libelle: string, motif: string) {
    conflits.value = [...conflits.value.filter(c => c.cle !== cle), { cle, libelle, motif, le: maintenant().toISOString() }]
  }

  function soumettre(cle: string, donnees: T, libelle: string) {
    if (enAttente(cle)) return { ok: true, horsLigne: true }
    conflits.value = conflits.value.filter(c => c.cle !== cle)
    const enregistreLe = maintenant().toISOString()
    if (!reseau.value) {
      file.value = [...file.value, { cle, libelle, donnees, enregistreLe }]
      return { ok: true, horsLigne: true }
    }
    const r = traiter(donnees, enregistreLe)
    return { ok: r.ok, motif: r.motif }
  }

  let enCours = false
  function synchroniser() {
    if (enCours || !reseau.value || !file.value.length) return 0
    enCours = true
    let transmises = 0
    try {
      const restantes: SaisieEnAttente<T>[] = []
      for (const s of file.value) {
        let r: ResultatTraitement
        try { r = traiter(s.donnees, s.enregistreLe) } catch { restantes.push(s); continue }
        if (r.ok) { transmises++; continue }
        if (r.conflit) { noterConflit(s.cle, s.libelle, r.motif ?? 'Transmission impossible.'); continue }
        restantes.push(s)
      }
      file.value = restantes
    } finally { enCours = false }
    return transmises
  }

  const instance: FileHorsReseau<T> = {
    enLigne: reseau, file, conflits, enAttente, conflit, soumettre, synchroniser,
    oublierConflit: (cle: string) => { conflits.value = conflits.value.filter(c => c.cle !== cle) },
  }
  files.set(cleStockage, instance as FileHorsReseau<unknown>)
  /* Une saisie restée en attente d'une session précédente part dès que possible. */
  if (reseau.value) setTimeout(() => synchroniser(), 0)
  return instance
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { reseau.value = true; files.forEach(f => f.synchroniser()) })
  window.addEventListener('offline', () => { reseau.value = false })
}

/* ── Les deux files du suivi de livraison ───────────────────────────── */

export interface DeclarationLivraison { voyageId: string; etapeId: string; articlesNonLivres: { id: string; motif: string }[]; quantiteRecue?: number; justificationQuantite?: string; mesures?: MesureCompartiment[] }
/** Réponse du destinataire depuis son lien : confirmation (son nom), ou contestation (son motif). */
export interface ConfirmationReception { voyageId: string; etapeId: string; nomSignataire: string; contestation?: string }

/** Déclarations de livraison du conducteur, sur son appareil. */
export function fileDeclarationsLivraison() {
  return creerFileHorsReseau<DeclarationLivraison>('fms-ucodis-declarations-hors-ligne',
    (d, le) => useVoyagesStore().transmettreDeclarationLivraison(d.voyageId, d.etapeId, d.articlesNonLivres, le, { recue: d.quantiteRecue, justification: d.justificationQuantite, mesures: d.mesures }))
}

/** Confirmations et contestations de réception du destinataire, depuis son lien de suivi. */
export function fileConfirmationsReception() {
  return creerFileHorsReseau<ConfirmationReception>('fms-ucodis-confirmations-hors-ligne',
    (d, le) => d.contestation != null
      ? useVoyagesStore().transmettreContestationReception(d.voyageId, d.etapeId, d.contestation, le)
      : useVoyagesStore().transmettreConfirmationReception(d.voyageId, d.etapeId, d.nomSignataire, le))
}
