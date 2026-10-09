import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Commande } from '../types'
import { aujourdhuiISO } from '../utils/horloge'

/** Le point de départ n'est pas la création directe d'une tournée, mais des
 *  commandes individuelles, chacune associée à un destinataire, une adresse
 *  et un contenu : elles s'accumulent ici en attendant d'être regroupées en
 *  chargement. Persisté dans le navigateur comme le reste de la
 *  planification, pour rester partagé entre les onglets. */
export const useCommandesStore = defineStore('commandes', () => {
  const SEED: Commande[] = [
    {
      id: 'CMD-001', destinataire: 'Jumbo Score Antananarivo', adresseLivraison: 'Ankorondrano, Antananarivo',
      lat: -18.8792, lng: 47.5079, contenu: 'Produits alimentaires secs', poidsKg: 4200, volumeM3: 18,
      dateSouhaitee: '2026-10-02', statut: 'en_attente', createdAt: '2026-09-27T08:00:00',
      nombreUnites: 350, referenceExterne: 'BL-26-10421', emisPar: 'Lova Rabemananjara', emisParRole: 'commercial', origine: 'demande',
    },
    {
      id: 'CMD-002', destinataire: 'Shoprite Antsirabe', adresseLivraison: 'Route Circulaire, Antsirabe',
      lat: -19.8659, lng: 47.0333, contenu: 'Boissons', poidsKg: 6100, volumeM3: 22,
      dateSouhaitee: '2026-10-02', statut: 'en_attente', createdAt: '2026-09-27T09:15:00',
      nombreUnites: 510, referenceExterne: 'BL-26-10422', emisPar: 'Lova Rabemananjara', emisParRole: 'commercial', origine: 'demande',
    },
    {
      id: 'CMD-003', destinataire: 'Leader Price Toamasina', adresseLivraison: 'Boulevard Joffre, Toamasina',
      lat: -18.1492, lng: 49.4023, contenu: 'Produits ménagers', poidsKg: 3400, volumeM3: 14,
      dateSouhaitee: '2026-10-03', statut: 'en_attente', createdAt: '2026-09-27T10:30:00',
      nombreUnites: 280, referenceExterne: 'BL-26-10427', emisPar: 'Lova Rabemananjara', emisParRole: 'commercial', origine: 'demande',
    },
  ]

  const CLE_STOCKAGE = 'fms-ucodis-commandes-v2'
  function chargerDepuisStockage(): Commande[] {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE)
      if (!brut) return SEED
      const parse = JSON.parse(brut)
      return Array.isArray(parse) ? parse : SEED
    } catch { return SEED }
  }

  const commandes = ref<Commande[]>(chargerDepuisStockage())
  function sauvegarder() {
    try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(commandes.value)) } catch { /* tant pis */ }
  }
  watch(commandes, sauvegarder, { deep: true })
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', e => {
      if (e.key === CLE_STOCKAGE && e.newValue) { try { commandes.value = JSON.parse(e.newValue) } catch { /* ignoré */ } }
    })
  }

  const enAttente = computed(() => commandes.value.filter(c => c.statut === 'en_attente'))
  const getById = (id: string) => commandes.value.find(c => c.id === id)

  let prochainId = commandes.value.length + 1
  function creer(saisie: Omit<Commande, 'id' | 'statut' | 'createdAt'>) {
    const id = `CMD-${String(prochainId++).padStart(3, '0')}`
    commandes.value.push({ ...saisie, id, statut: 'en_attente', createdAt: aujourdhuiISO() })
    return id
  }

  /** L'émetteur modifie sa demande tant qu'elle n'est pas dans un ordre ;
   *  une demande rejetée, une fois corrigée, repart en attente. */
  function modifier(id: string, saisie: Partial<Omit<Commande, 'id' | 'statut' | 'voyageId' | 'createdAt'>>) {
    const c = getById(id)
    if (!c || (c.statut !== 'en_attente' && c.statut !== 'rejetee')) return { ok: false, motif: "Cette demande n'est plus modifiable : elle est déjà dans un ordre de transport, ou annulée." }
    Object.assign(c, saisie)
    if (c.statut === 'rejetee') { c.statut = 'en_attente'; c.motifRejet = undefined; c.rejeteeLe = undefined; c.rejeteePar = undefined }
    return { ok: true }
  }

  /** Le planificateur renvoie une demande à son émetteur, avec un motif
   *  (adresse incomplète, volume impossible à transporter...). */
  function rejeter(id: string, motif: string, par: string) {
    const c = getById(id)
    if (!c || c.statut !== 'en_attente') return { ok: false, motif: "Seule une demande en attente peut être rejetée." }
    if (!motif.trim()) return { ok: false, motif: 'Indiquez le motif du rejet.' }
    c.statut = 'rejetee'; c.motifRejet = motif.trim(); c.rejeteeLe = aujourdhuiISO(); c.rejeteePar = par
    return { ok: true }
  }

  /** L'émetteur retire sa demande tant qu'elle n'est dans aucun ordre. */
  function annuler(id: string, motif: string) {
    const c = getById(id)
    if (!c || (c.statut !== 'en_attente' && c.statut !== 'rejetee')) return { ok: false, motif: "Cette demande est déjà dans un ordre de transport : demandez au planificateur de l'en retirer." }
    if (!motif.trim()) return { ok: false, motif: "Indiquez le motif de l'annulation." }
    c.statut = 'annulee'; c.motifAnnulation = motif.trim(); c.annuleeLe = aujourdhuiISO()
    return { ok: true }
  }

  function supprimer(id: string) {
    const c = getById(id)
    if (!c || c.statut !== 'en_attente') return { ok: false, motif: "Cette commande n'est plus en attente." }
    commandes.value = commandes.value.filter(x => x.id !== id)
    return { ok: true }
  }

  /** Affecte un lot de commandes en attente à l'ordre de transport qui vient
   *  de les regrouper : chacune devient indisponible pour un autre
   *  chargement. */
  function affecter(ids: string[], voyageId: string) {
    ids.forEach(id => { const c = getById(id); if (c) { c.statut = 'affectee'; c.voyageId = voyageId } })
  }

  /** Une commande retirée d'un chargement - avant le départ de la tournée -
   *  redevient disponible pour un nouveau regroupement. */
  function remettreEnAttente(id: string) {
    const c = getById(id)
    if (c) { c.statut = 'en_attente'; c.voyageId = undefined }
  }

  return { commandes, enAttente, getById, creer, modifier, supprimer, affecter, remettreEnAttente, rejeter, annuler }
})
