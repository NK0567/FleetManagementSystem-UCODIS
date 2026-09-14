import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Trajet, RoleEtape } from '../types'

/**
 * Trajets de référence · un trajet est un ensemble de sites ORDONNÉS.
 * Le système ne calcule aucun itinéraire : il enregistre l'ordre des sites,
 * comme le fait le socle FMS. Le corridor Antananarivo ↔ Toamasina reprend
 * exactement les coordonnées déjà utilisées pour la Carte temps réel.
 *
 * Les noms de clients sont une hypothèse illustrative : aucun document
 * UCODIS ne nomme de client précis (point à trancher).
 */
export const useTrajetsStore = defineStore('trajets', () => {
  const trajets = ref<Trajet[]>([
    {
      id: 'TRJ-001', code: 'TNR-TOA-STD', libelle: 'Antananarivo → Toamasina (RN2 standard)',
      recurrent: true, clientNom: 'Jumbo Score Tanjombato', statut: 'actif',
      distanceEstimeeKm: 352, dureeEstimeeMin: 450,
      etapes: [
        { id: 'ET-001', siteNom: 'Dépôt UCODIS Tanjombato', ordre: 1, lat: -18.8792, lng: 47.5079, role: 'depart', intervalleMin: 0 },
        { id: 'ET-002', siteNom: 'Entrepôt Tanjombato',     ordre: 2, lat: -18.9167, lng: 47.5300, role: 'chargement', intervalleMin: 25 },
        { id: 'ET-003', siteNom: 'Relais Moramanga',        ordre: 3, lat: -18.9333, lng: 47.9333, role: 'repos', intervalleMin: 110, pausePrevueMin: 45 },
        { id: 'ET-004', siteNom: 'Contrôle Brickaville',    ordre: 4, lat: -18.6667, lng: 48.9833, role: 'controle', intervalleMin: 55 },
        { id: 'ET-005', siteNom: 'Entrepôt Toamasina',      ordre: 5, lat: -18.1492, lng: 49.4023, role: 'livraison', intervalleMin: 140 },
      ],
    },
    {
      id: 'TRJ-002', code: 'TNR-ATS-STD', libelle: 'Antananarivo → Antsirabe (RN7)',
      recurrent: true, clientNom: 'Leader Price Antsirabe', statut: 'actif',
      distanceEstimeeKm: 168, dureeEstimeeMin: 210,
      etapes: [
        { id: 'ET-010', siteNom: 'Dépôt UCODIS Tanjombato', ordre: 1, lat: -18.8792, lng: 47.5079, role: 'depart', intervalleMin: 0 },
        { id: 'ET-011', siteNom: 'Station Ambatolampy',     ordre: 2, lat: -19.3833, lng: 47.4167, role: 'controle', intervalleMin: 95 },
        { id: 'ET-012', siteNom: 'Entrepôt Antsirabe centre', ordre: 3, lat: -19.8667, lng: 47.0333, role: 'livraison', intervalleMin: 75 },
      ],
    },
    {
      id: 'TRJ-003', code: 'TNR-MJN-STD', libelle: 'Antananarivo → Mahajanga (RN4)',
      recurrent: true, clientNom: 'Shoprite Mahajanga', statut: 'actif',
      distanceEstimeeKm: 570, dureeEstimeeMin: 720,
      etapes: [
        { id: 'ET-020', siteNom: 'Dépôt UCODIS Tanjombato', ordre: 1, lat: -18.8792, lng: 47.5079, role: 'depart', intervalleMin: 0 },
        { id: 'ET-021', siteNom: 'Contrôle Ankazobe',       ordre: 2, lat: -18.3167, lng: 47.1167, role: 'controle', intervalleMin: 130 },
        { id: 'ET-022', siteNom: 'Contrôle Maevatanana',    ordre: 3, lat: -16.9500, lng: 46.8333, role: 'controle', intervalleMin: 240, pausePrevueMin: 45 },
        { id: 'ET-023', siteNom: 'Entrepôt Mahajanga',      ordre: 4, lat: -15.7167, lng: 46.3167, role: 'livraison', intervalleMin: 260 },
      ],
    },
  ])

  const getById = (id: string) => trajets.value.find(t => t.id === id)
  const actifs = computed(() => trajets.value.filter(t => t.statut === 'actif'))
  const recurrents = computed(() => trajets.value.filter(t => t.recurrent && t.statut === 'actif'))

  function traceDe(etapes: { lat: number; lng: number; ordre: number }[]) {
    return [...etapes].sort((a, b) => a.ordre - b.ordre).map(e => ({ lat: e.lat, lng: e.lng }))
  }

  let prochainNumero = trajets.value.length + 1
  function creer(saisie: Omit<Trajet, 'id'>) {
    const id = `TRJ-perso-${prochainNumero++}`
    trajets.value.push({ ...saisie, id })
    return id
  }
  function update(id: string, saisie: Partial<Omit<Trajet, 'id'>>) {
    const t = getById(id)
    if (!t) return
    if (saisie.etapes) {
      const etapes = renumeroter(saisie.etapes)
      Object.assign(t, saisie, {
        etapes,
        distanceEstimeeKm: distanceSimulee(etapes),
        dureeEstimeeMin: dureeSimulee(etapes),
      })
    } else {
      Object.assign(t, saisie)
    }
  }
  function archiver(id: string) { update(id, { statut: 'archive' }) }

  /** Distance à vol d'oiseau cumulée · sert à la simulation, jamais à la facturation. */
  function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371
    const dLat = ((b.lat - a.lat) * Math.PI) / 180
    const dLng = ((b.lng - a.lng) * Math.PI) / 180
    const la1 = (a.lat * Math.PI) / 180
    const la2 = (b.lat * Math.PI) / 180
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(h))
  }
  function distanceSimulee(etapes: { lat: number; lng: number; ordre: number }[]): number {
    const pts = [...etapes].sort((a, b) => a.ordre - b.ordre)
    let total = 0
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]; const b = pts[i]
      if (a && b) total += distanceKm(a, b)
    }
    return Math.round(total)
  }
  function dureeSimulee(etapes: { intervalleMin: number; pausePrevueMin?: number }[]): number {
    return etapes.reduce((s, e) => s + (e.intervalleMin ?? 0) + (e.pausePrevueMin ?? 0), 0)
  }
  /** Renumérote les étapes après un glisser-déposer. */
  function renumeroter<T extends { ordre: number }>(etapes: T[]): T[] {
    return etapes.map((e, i) => ({ ...e, ordre: i + 1 }))
  }
  function nouvelleEtape(site: { id: string; nom: string; lat: number; lng: number }, ordre: number, role: RoleEtape = 'livraison') {
    return {
      id: `ET-${Date.now()}-${ordre}`, siteId: site.id, siteNom: site.nom,
      ordre, lat: site.lat, lng: site.lng, role, volet: 'aller' as const, intervalleMin: 0,
    }
  }

  return { trajets, getById, actifs, recurrents, distanceSimulee, dureeSimulee, renumeroter, nouvelleEtape, traceDe, creer, update, archiver }
})
