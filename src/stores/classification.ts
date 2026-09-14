import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Type de congé : durée, mode d'acquisition, pièce exigée. */
export interface TypeConge {
  id: string
  code: string
  libelle: string
  couleur: string
  icone: string
  /** Type légalement obligatoire : ne peut pas être désactivé. */
  systeme: boolean
  actif: boolean
  droitAnnuel: number | null
  accumMensuelle: number | null
  reportMax: number | null
  preavisJours: number
  justificatif: boolean
  remunere: boolean
  commentaire?: string
}

/** Catégorie de personnel : sert de base au droit à congé. */
export interface Categorie {
  id: string
  code: string
  libelle: string
  droitAnnuel: number
  description: string
  actif: boolean
}

export const useClassificationStore = defineStore('classification', () => {
  const typesConge = ref<TypeConge[]>([
    { id: 'tc1', code: 'CA',  libelle: 'Congé annuel',            couleur: '#1D4ED8', icone: 'calendar', systeme: true,  actif: true, droitAnnuel: 30, accumMensuelle: 2.5, reportMax: 6,   preavisJours: 15, justificatif: false, remunere: true },
    { id: 'tc2', code: 'CM',  libelle: 'Congé maladie',           couleur: '#15803D', icone: 'stethoscope', systeme: true,  actif: true, droitAnnuel: 8,  accumMensuelle: null, reportMax: null, preavisJours: 0,  justificatif: true,  remunere: true, commentaire: 'Certificat médical exigé sous 48 heures.' },
    { id: 'tc3', code: 'REC', libelle: 'Récupération',            couleur: '#92400E', icone: 'clock', systeme: false, actif: true, droitAnnuel: null, accumMensuelle: null, reportMax: null, preavisJours: 2,  justificatif: false, remunere: true, commentaire: 'Acquise voyage par voyage, sans droit annuel fixe.' },
    { id: 'tc4', code: 'MAT', libelle: 'Congé maternité',         couleur: '#BE185D', icone: 'heart', systeme: true,  actif: true, droitAnnuel: 98, accumMensuelle: null, reportMax: null, preavisJours: 30, justificatif: true,  remunere: true },
    { id: 'tc5', code: 'PE',  libelle: 'Permission exceptionnelle', couleur: '#6D28D9', icone: 'star', systeme: false, actif: true, droitAnnuel: 2,  accumMensuelle: null, reportMax: 0,   preavisJours: 1,  justificatif: true,  remunere: true, commentaire: 'Mariage, naissance, décès.' },
    { id: 'tc6', code: 'SS',  libelle: 'Absence sans solde',      couleur: '#6B7280', icone: 'home', systeme: false, actif: true, droitAnnuel: null, accumMensuelle: null, reportMax: null, preavisJours: 7,  justificatif: true, remunere: false },
  ])

  const categories = ref<Categorie[]>([
    { id: 'ct1', code: 'CAT-A', libelle: 'Cadre',      droitAnnuel: 30, actif: true, description: "Direction, responsable flotte, administrateur." },
    { id: 'ct2', code: 'CAT-B', libelle: 'Agent de maîtrise', droitAnnuel: 30, actif: true, description: "Technicien de maintenance, chargé de clientèle, agent commercial." },
    { id: 'ct3', code: 'CAT-C', libelle: 'Personnel roulant', droitAnnuel: 30, actif: true, description: "Conducteurs et aides conducteurs de l'équipe conduite." },
    { id: 'ct4', code: 'CAT-D', libelle: 'Personnel de dépôt', droitAnnuel: 30, actif: true, description: "Agents de dépôt chargés du chargement et du comptage." },
  ])

  let prochainCatId = categories.value.length + 1
  function creerCategorie(c: Omit<Categorie, 'id'>) {
    categories.value.push({ ...c, id: `ct-perso-${prochainCatId++}` })
  }
  function mettreAJourCategorie(id: string, patch: Partial<Omit<Categorie, 'id'>>) {
    const c = categories.value.find(x => x.id === id)
    if (c) Object.assign(c, patch)
  }
  function supprimerCategorie(id: string) {
    categories.value = categories.value.filter(c => c.id !== id)
  }

  let prochainTypeId = typesConge.value.length + 1
  function creerTypeConge(t: Omit<TypeConge, 'id'>) {
    typesConge.value.push({ ...t, id: `tc-perso-${prochainTypeId++}` })
  }
  function mettreAJourTypeConge(id: string, patch: Partial<Omit<TypeConge, 'id'>>) {
    const t = typesConge.value.find(x => x.id === id)
    if (t) Object.assign(t, patch)
  }
  function supprimerTypeConge(id: string) {
    typesConge.value = typesConge.value.filter(t => t.id !== id)
  }

  /**
   * Rattachement des fonctions aux catégories · à valider par UCODIS, comme
   * signalé dans le document de user stories. Sert de valeur par défaut à
   * la création d'un employé ; reste modifiable ensuite sur sa fiche.
   */
  const RATTACHEMENT_FONCTION_CATEGORIE: Record<string, string> = {
    'f-dir': 'ct1', 'f-rflotte': 'ct1', 'f-adm': 'ct1',
    'f-maint': 'ct2', 'f-cli': 'ct2', 'f-com': 'ct2',
    'f-cond': 'ct3', 'f-aide': 'ct3',
    'f-depot': 'ct4',
  }
  function categorieParDefaut(fonctionId: string): string | undefined {
    return RATTACHEMENT_FONCTION_CATEGORIE[fonctionId]
  }

  return {
    typesConge, categories, creerCategorie, mettreAJourCategorie, supprimerCategorie,
    creerTypeConge, mettreAJourTypeConge, supprimerTypeConge, categorieParDefaut,
  }
})
