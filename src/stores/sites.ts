import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { SiteReseau } from '../types'
import { useVehiculeStore } from './vehicules'
import { SITES_DEMO } from './donneesCarburant'
import { useTypesSitesStore } from './typesSites'
import { useClientsStore } from './clients'

/**
 * Référentiel des sites (FMS-DB-14), partagé avec le TMS : type paramétrable,
 * adresse, zone de géorepérage (centre et rayon) et statut actif ou inactif.
 * L'entrée et la sortie d'une zone sont horodatées par le suivi GPS.
 */
const CLE = 'fms-ucodis-sites'

export const useSitesStore = defineStore('sites', () => {
  const sites = ref<SiteReseau[]>([
    { id: 'site-001', code: 'DEP-TNJ', nom: 'Dépôt Tanjombato', type: 'Dépôt', lat: -18.8792, lng: 47.5079, ville: 'Antananarivo', region: 'Analamanga', rayonM: 800, actif: true, email: 'chargement@depot-tanjombato.mg' },
    { id: 'site-002', code: 'ENT-TNJ', nom: 'Entrepôt Tanjombato', type: 'Dépôt', lat: -18.9167, lng: 47.5300, ville: 'Antananarivo', region: 'Analamanga', rayonM: 800, actif: true },
    { id: 'site-003', code: 'ENT-TOA', nom: 'Entrepôt Toamasina', type: 'Entrepôt client', lat: -18.1492, lng: 49.4023, ville: 'Toamasina', region: 'Atsinanana', rayonM: 800, actif: true },
    { id: 'site-004', code: 'ENT-ATS', nom: 'Entrepôt Antsirabe centre', type: 'Entrepôt client', lat: -19.8667, lng: 47.0333, ville: 'Antsirabe', region: 'Vakinankaratra', rayonM: 800, actif: true },
    { id: 'site-005', code: 'ENT-MJN', nom: 'Entrepôt Mahajanga', type: 'Entrepôt client', lat: -15.7167, lng: 46.3167, ville: 'Mahajanga', region: 'Boeny', rayonM: 800, actif: true },
    { id: 'site-006', code: 'REL-MOR', nom: 'Relais Moramanga', type: 'Relais', lat: -18.9333, lng: 47.9333, ville: 'Moramanga', region: 'Alaotra-Mangoro', rayonM: 1000, actif: true },
    { id: 'site-007', code: 'PTC-BRK', nom: 'Contrôle Brickaville', type: 'Point de contrôle', lat: -18.6667, lng: 48.9833, ville: 'Brickaville', region: 'Atsinanana', rayonM: 600, actif: true },
    { id: 'site-008', code: 'STA-AMB', nom: 'Station Ambatolampy', type: 'Point de contrôle', lat: -19.3833, lng: 47.4167, ville: 'Ambatolampy', region: 'Vakinankaratra', rayonM: 600, actif: true },
    { id: 'site-009', code: 'PTC-ANK', nom: 'Contrôle Ankazobe', type: 'Point de contrôle', lat: -18.3167, lng: 47.1167, ville: 'Ankazobe', region: 'Analamanga', rayonM: 600, actif: true },
    { id: 'site-010', code: 'PTC-MEV', nom: 'Contrôle Maevatanana', type: 'Point de contrôle', lat: -16.9500, lng: 46.8333, ville: 'Maevatanana', region: 'Betsiboka', rayonM: 600, actif: true },
    { id: 'site-011', code: 'ZAR-RN2', nom: 'Zone à risque RN2', type: 'Zone à risque', lat: -18.7500, lng: 48.7000, ville: 'Route Nationale 2', region: 'Alaotra-Mangoro', rayonM: 3000, actif: true },
    ...SITES_DEMO.map(s => ({ ...s })),
  ])

  try { const b = localStorage.getItem(CLE); if (b) sites.value = JSON.parse(b) } catch { /* défaut */ }
  /* Référentiel enregistré avant l'ajout du dépôt pétrolier de démonstration. */
  SITES_DEMO.filter(s => !sites.value.some(x => x.id === s.id || x.code === s.code)).forEach(s => sites.value.push({ ...s }))
  watch(sites, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  const getById = (id: string) => sites.value.find(s => s.id === id)
  const actifs = computed(() => sites.value.filter(s => s.actif))
  /** Dépôt de chargement : défini par la case du type de site, jamais par son nom. */
  const estDepot = (s?: Pick<SiteReseau, 'type'> | null) => !!s && useTypesSitesStore().estTypeDepot(s.type)
  const depots = computed(() => actifs.value.filter(s => estDepot(s)))
  /** Sites de livraison actifs d'un client, retrouvé par son identifiant ou son nom. */
  function sitesDuClient(clientIdOuNom?: string) {
    const c = clientIdOuNom ? (useClientsStore().getById(clientIdOuNom) ?? useClientsStore().parNom(clientIdOuNom)) : undefined
    return c ? actifs.value.filter(s => s.clientId === c.id) : []
  }

  /** Contrôles communs à la création et à la modification d'un site (FMS-DB-14). */
  function controler(d: Partial<SiteReseau>, ignorerId?: string): string | null {
    if (d.code !== undefined && !d.code.trim()) return 'Le code est obligatoire.'
    if (d.code && sites.value.some(s => s.id !== ignorerId && s.code === d.code!.trim().toUpperCase())) return 'Ce code existe déjà.'
    if (d.nom !== undefined && !d.nom.trim()) return 'Le nom est obligatoire.'
    if (d.nom && sites.value.some(s => s.id !== ignorerId && s.nom.trim().toLowerCase() === d.nom!.trim().toLowerCase())) return 'Un site porte déjà ce nom.'
    if (d.type !== undefined && !d.type) return 'Le type est obligatoire.'
    if (d.lat !== undefined && (!Number.isFinite(d.lat) || d.lat < -90 || d.lat > 90)) return 'La latitude est hors des bornes (de -90 à 90).'
    if (d.lng !== undefined && (!Number.isFinite(d.lng) || d.lng < -180 || d.lng > 180)) return 'La longitude est hors des bornes (de -180 à 180).'
    if (typeof d.proprietaireTiers === 'string' && !d.proprietaireTiers.trim()) return 'Indiquez le tiers à qui appartient le site.'
    if (d.rayonM !== undefined && (!Number.isFinite(d.rayonM) || d.rayonM < 50 || d.rayonM > 20_000)) return 'Le rayon de la zone va de 50 m à 20 km.'
    if (d.clientId && !useClientsStore().getById(d.clientId)) return 'Client introuvable dans le référentiel des clients.'
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return `Adresse e-mail invalide : ${d.email.trim()}`
    return null
  }
  function creer(saisie: Omit<SiteReseau, 'id'>): { ok: boolean; id?: string; motif?: string } {
    const motif = controler(saisie); if (motif) return { ok: false, motif }
    let n = sites.value.length + 1
    while (sites.value.some(s => s.id === `site-perso-${n}`)) n++
    const id = `site-perso-${n}`
    sites.value.push({ ...saisie, code: saisie.code.trim().toUpperCase(), nom: saisie.nom.trim(), id })
    return { ok: true, id }
  }
  /** Véhicules au parc dont ce site est la base. */
  const vehiculesDeBase = (nom: string) => useVehiculeStore().liste.filter(v => v.statut !== 'sorti' && v.site === nom)
  function modifier(id: string, saisie: Partial<Omit<SiteReseau, 'id' | 'code'>>): { ok: boolean; motif?: string } {
    const s = getById(id); if (!s) return { ok: false, motif: 'Site introuvable.' }
    const motif = controler(saisie, id); if (motif) return { ok: false, motif }
    /* Un site qui sert de base à des véhicules ne se désactive pas. */
    if (saisie.actif === false && s.actif) {
      const n = vehiculesDeBase(s.nom).length
      if (n) return { ok: false, motif: `${s.nom} est la base de ${n} véhicule(s) : changez d'abord leur base.` }
    }
    /* Renommer un site met à jour la base des véhicules qui le portent, archives comprises. */
    const ancienNom = s.nom
    const nouveauNom = saisie.nom?.trim()
    Object.assign(s, saisie, nouveauNom ? { nom: nouveauNom } : {})
    if (nouveauNom && nouveauNom !== ancienNom) useVehiculeStore().liste.filter(v => v.site === ancienNom).forEach(v => { v.site = nouveauNom })
    return { ok: true }
  }

  return { sites, getById, actifs, estDepot, depots, sitesDuClient, creer, modifier }
})
