import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useVehiculeStore } from './vehicules'
import { etatEcheance } from '../utils/helpers'
import { dansNJours } from '../utils/horloge'

export type TypeDocumentVehicule = 'Carte grise' | 'Assurance véhicule' | 'Visite technique' | 'Vignette' | 'Carte fiscale'

export interface DocumentVehicule {
  id: string
  vehiculeId: string
  type: TypeDocumentVehicule
  numero?: string
  dateEmission?: string
  echeance: string
  archive?: boolean
}

/**
 * US FLT-19 · documents administratifs du véhicule, sur le même principe
 * que les documents du personnel : dépôt avec échéance, état déduit
 * automatiquement, jamais saisi à la main.
 */
export const useDocumentsVehiculeStore = defineStore('documentsVehicule', () => {
  const vehicules = useVehiculeStore()

  /** Durée de validité usuelle par type de document, pour dériver une date d'émission plausible. */
  const DUREE_VALIDITE_JOURS: Record<TypeDocumentVehicule, number> = {
    'Carte grise': 365 * 10, 'Assurance véhicule': 365, 'Visite technique': 180, 'Vignette': 365, 'Carte fiscale': 365,
  }
  function numeroPour(type: TypeDocumentVehicule, vehiculeId: string, n: number): string {
    const PREFIXE: Record<TypeDocumentVehicule, string> = {
      'Carte grise': 'CG', 'Assurance véhicule': 'ARO', 'Visite technique': 'VT', 'Vignette': 'VIG', 'Carte fiscale': 'CF',
    }
    return `${PREFIXE[type]}-2026-${String(1000 + n).slice(-4)}`
  }

  function seed(): DocumentVehicule[] {
    const out: DocumentVehicule[] = []
    let n = 1
    const echeances = [
      dansNJours(400), dansNJours(280), dansNJours(150), dansNJours(90),
      dansNJours(365), dansNJours(200), dansNJours(120), dansNJours(60),
      dansNJours(-6),   // expiré · critique
      dansNJours(18),   // à renouveler sous 30 j · avertissement
      dansNJours(500),
    ]
    let i = 0
    vehicules.liste.forEach(v => {
      (['Carte grise', 'Assurance véhicule', 'Visite technique', 'Vignette', 'Carte fiscale'] as TypeDocumentVehicule[]).forEach(type => {
        const echeance = echeances[i % echeances.length]!
        i++
        // On ne peuple pas toutes les combinaisons pour rester lisible dans la démo
        if ((type === 'Vignette' || type === 'Carte fiscale') && i % 3 !== 0) return
        const dureeJours = DUREE_VALIDITE_JOURS[type]
        const dateEmission = new Date(new Date(echeance).getTime() - dureeJours * 86_400_000).toISOString().slice(0, 10)
        out.push({ id: `dv-${n}`, vehiculeId: v.id, type, echeance, dateEmission, numero: numeroPour(type, v.id, n) })
        n++
      })
    })
    return out
  }

  const liste = ref<DocumentVehicule[]>(seed())

  function etat(doc: DocumentVehicule) { return etatEcheance(doc.echeance) }

  let prochainId = liste.value.length + 1
  function creer(saisie: Omit<DocumentVehicule, 'id'>) {
    const id = `dv-perso-${prochainId++}`
    liste.value.push({ ...saisie, id })
    return id
  }
  function modifier(id: string, saisie: Partial<Omit<DocumentVehicule, 'id'>>) {
    const d = liste.value.find(x => x.id === id)
    if (d) Object.assign(d, saisie)
  }
  function supprimer(id: string) {
    const i = liste.value.findIndex(x => x.id === id)
    if (i >= 0) liste.value.splice(i, 1)
  }

  const critiques = computed(() => liste.value.filter(d => etat(d) === 'expire'))
  const avertissements = computed(() => liste.value.filter(d => etat(d) === 'proche'))
  const alertesActives = computed(() => [...critiques.value, ...avertissements.value])

  function documentsDe(vehiculeId: string) { return liste.value.filter(d => d.vehiculeId === vehiculeId) }

  /** Un véhicule est en règle si aucun de ses documents n'est expiré. */
  function enRegle(vehiculeId: string) { return !documentsDe(vehiculeId).some(d => etat(d) === 'expire') }

  return { liste, etat, critiques, avertissements, alertesActives, documentsDe, enRegle, creer, modifier, supprimer }
})
