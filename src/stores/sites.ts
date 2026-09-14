import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SiteReseau } from '../types'

/**
 * Référentiel des sites, repris du store sites du socle FMS. Les coordonnées du
 * corridor Antananarivo ↔ Toamasina reprennent exactement celles déjà
 * utilisées par la Carte temps réel et les trajets de référence, pour ne
 * jamais avoir deux versions de la même réalité géographique.
 */
export const useSitesStore = defineStore('sites', () => {
  const sites = ref<SiteReseau[]>([
    { id: 'site-001', code: 'DEP-TNJ', nom: 'Dépôt UCODIS Tanjombato', type: 'Dépôt', lat: -18.8792, lng: 47.5079, ville: 'Antananarivo', region: 'Analamanga', actif: true },
    { id: 'site-002', code: 'ENT-TNJ', nom: 'Entrepôt Tanjombato', type: 'Dépôt', lat: -18.9167, lng: 47.5300, ville: 'Antananarivo', region: 'Analamanga', actif: true },
    { id: 'site-003', code: 'ENT-TOA', nom: 'Entrepôt Toamasina', type: 'Entrepôt client', lat: -18.1492, lng: 49.4023, ville: 'Toamasina', region: 'Atsinanana', actif: true },
    { id: 'site-004', code: 'ENT-ATS', nom: 'Entrepôt Antsirabe centre', type: 'Entrepôt client', lat: -19.8667, lng: 47.0333, ville: 'Antsirabe', region: 'Vakinankaratra', actif: true },
    { id: 'site-005', code: 'ENT-MJN', nom: 'Entrepôt Mahajanga', type: 'Entrepôt client', lat: -15.7167, lng: 46.3167, ville: 'Mahajanga', region: 'Boeny', actif: true },
    { id: 'site-006', code: 'REL-MOR', nom: 'Relais Moramanga', type: 'Relais', lat: -18.9333, lng: 47.9333, ville: 'Moramanga', region: 'Alaotra-Mangoro', actif: true },
    { id: 'site-007', code: 'PTC-BRK', nom: 'Contrôle Brickaville', type: 'Point de contrôle', lat: -18.6667, lng: 48.9833, ville: 'Brickaville', region: 'Atsinanana', actif: true },
    { id: 'site-008', code: 'STA-AMB', nom: 'Station Ambatolampy', type: 'Point de contrôle', lat: -19.3833, lng: 47.4167, ville: 'Ambatolampy', region: 'Vakinankaratra', actif: true },
    { id: 'site-009', code: 'PTC-ANK', nom: 'Contrôle Ankazobe', type: 'Point de contrôle', lat: -18.3167, lng: 47.1167, ville: 'Ankazobe', region: 'Analamanga', actif: true },
    { id: 'site-010', code: 'PTC-MEV', nom: 'Contrôle Maevatanana', type: 'Point de contrôle', lat: -16.9500, lng: 46.8333, ville: 'Maevatanana', region: 'Betsiboka', actif: true },
    { id: 'site-011', code: 'ZAR-RN2', nom: 'Zone à risque RN2', type: 'Zone à risque', lat: -18.7500, lng: 48.7000, ville: 'Route Nationale 2', region: 'Alaotra-Mangoro', actif: true },
  ])

  const getById = (id: string) => sites.value.find(s => s.id === id)
  const actifs = computed(() => sites.value.filter(s => s.actif))

  let prochainId = sites.value.length + 1
  function creer(saisie: Omit<SiteReseau, 'id'>) {
    const id = `site-perso-${prochainId++}`
    sites.value.push({ ...saisie, id })
    return id
  }
  function modifier(id: string, saisie: Partial<Omit<SiteReseau, 'id' | 'code'>>) {
    const s = getById(id)
    if (s) Object.assign(s, saisie)
  }

  return { sites, getById, actifs, creer, modifier }
})
