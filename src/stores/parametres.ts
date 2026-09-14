import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Parametres, Site, Societe } from '../types'

export const useParametresStore = defineStore('parametres', () => {
  /**
   * Identité de l'entité, reprise du cahier des charges,
   * feuille Sommaires, section I · Contexte & enjeux.
   */
  const societe = ref<Societe>({
    raisonSociale: 'UCODIS',
    entite: 'UCODIS Transport',
    activite: "Transport de marchandises sur longue distance pour le compte d'UCODIS",
    adresse: 'Antananarivo',
    pays: 'Madagascar',
    nifStat: 'à renseigner',
    parcTracteurs: 10,
    parcSemiRemorques: 10,
  })

  const sites = ref<Site[]>([
    { id: 's1', code: 'SIEGE', nom: 'Siège Antananarivo', adresse: 'Antananarivo', type: 'siege' },
    { id: 's2', code: 'DEPOT', nom: 'Dépôt UCODIS Tanjombato', adresse: 'Tanjombato, Antananarivo', type: 'depot' },
    { id: 's3', code: 'GARAGE', nom: 'Garage Antananarivo', adresse: 'Antananarivo', type: 'garage' },
  ])

  /**
   * Aucun seuil n'est codé en dur.
   * Le délai d'alerte vient du module 9 : J-30 par défaut, paramétrable.
   * Les temps de conduite sont laissés au réglage d'UCODIS : le cahier des
   * charges cite les règles HOS/ELD, qui sont nord-américaines.
   */
  const valeurs = ref<Parametres>({
    seuilAlerteJours: 30,
    escaladeJours: 7,
    conduiteMaxJournaliereH: 9,
    reposMinJournalierH: 11,
    conduiteMaxHebdoH: 56,
  })

  return { societe, sites, valeurs }
})
