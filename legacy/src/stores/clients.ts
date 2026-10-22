import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useCommandesStore } from './commandes'
import { useVoyagesStore } from './voyages'
import { useTarifsTransportStore } from './tarifsTransport'
import { useContraintesLivraisonStore } from './contraintesLivraison'
import { useControlesTransportStore } from './controlesTransport'
import { useSitesStore } from './sites'

export type CanalNotification = 'sms' | 'email' | 'sms_email'
export const LIB_CANAL: Record<CanalNotification, string> = { sms: 'SMS', email: 'E-mail', sms_email: 'SMS et e-mail' }

/** Service de l'entreprise elle-même, ou client externe. */
export type NatureTiers = 'interne' | 'externe'
export const LIB_NATURE_TIERS: Record<NatureTiers, string> = { interne: "Service de l'entreprise", externe: 'Client externe' }

/**
 * Fiche d'un ordonnateur ou d'un destinataire. Un même tiers peut tenir les
 * deux rôles ; un ordonnateur peut être un service de l'entreprise ou un
 * client externe.
 */
export interface Client {
  id: string
  nom: string
  /** Faux par défaut pour les fiches enregistrées avant l'ajout des rôles : lire via estOrdonnateur / estDestinataire. */
  ordonnateur?: boolean
  destinataire?: boolean
  nature?: NatureTiers
  adresse?: string
  ville?: string
  contact?: string
  telephone?: string
  email?: string
  /** Canal par défaut des notifications de ce tiers (SMS par défaut) ; une
   *  commande peut le préciser autrement (livraison chez un tiers, par ex.). */
  canalPrefere?: CanalNotification
}

export type SaisieClient = Omit<Client, 'id'>
export interface Resultat { ok: boolean; motif?: string }

/**
 * Clients de référence, repris des noms déjà utilisés dans les voyages et
 * trajets de référence : une hypothèse illustrative (aucun document ne
 * nomme de client précis).
 */
const DEFAUT: Client[] = [
  { id: 'cli-001', nom: 'Jumbo Score Tanjombato', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Route de Tanjombato', ville: 'Antananarivo', contact: 'Service réception', telephone: '020 22 123 45', email: 'reception@jumboscore-tnj.mg', canalPrefere: 'sms_email' },
  { id: 'cli-002', nom: 'Leader Price Antsirabe', ordonnateur: true, destinataire: true, nature: 'externe', adresse: 'Route Circulaire', ville: 'Antsirabe', contact: 'Service réception', telephone: '020 44 567 89', email: 'reception@leaderprice-antsirabe.mg', canalPrefere: 'email' },
  { id: 'cli-003', nom: 'Shoprite Mahajanga', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Rue du Commerce', ville: 'Mahajanga', contact: 'Service réception', telephone: '020 62 345 67', canalPrefere: 'sms' },
  { id: 'cli-005', nom: 'Jumbo Score Antananarivo', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Ankorondrano', ville: 'Antananarivo', contact: 'Service réception', telephone: '020 22 234 56', canalPrefere: 'sms' },
  { id: 'cli-006', nom: 'Shoprite Antsirabe', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Route Circulaire', ville: 'Antsirabe', contact: 'Service réception', telephone: '020 44 678 90', canalPrefere: 'sms' },
  { id: 'cli-007', nom: 'Leader Price Toamasina', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Boulevard Joffre', ville: 'Toamasina', contact: 'Service réception', telephone: '020 53 321 45', email: 'reception@leaderprice-toamasina.mg', canalPrefere: 'sms_email' },
  { id: 'cli-008', nom: 'Quincaillerie Centrale Antsirabe', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Route Circulaire', ville: 'Antsirabe', contact: 'Service réception', telephone: '034 05 123 45', canalPrefere: 'sms' },
  { id: 'cli-009', nom: 'Super U Toamasina', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Boulevard Joffre', ville: 'Toamasina', contact: 'Service réception', telephone: '020 53 456 78', canalPrefere: 'sms' },
  { id: 'cli-010', nom: 'Station-service Ambohimanarina', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Route d\'Ambohimanarina', ville: 'Antananarivo', contact: 'Service réception', telephone: '034 20 101 01', canalPrefere: 'sms' },
  { id: 'cli-011', nom: 'Station-service Ivato', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Route de l\'aéroport, Ivato', ville: 'Antananarivo', contact: 'Service réception', telephone: '034 20 101 02', canalPrefere: 'sms' },
  { id: 'cli-012', nom: 'Station-service Anosizato', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Anosizato', ville: 'Antananarivo', contact: 'Service réception', telephone: '034 20 101 03', canalPrefere: 'sms' },
  { id: 'cli-013', nom: 'Station-service Ampitatafika', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Ampitatafika', ville: 'Antananarivo', contact: 'Service réception', telephone: '034 20 101 04', canalPrefere: 'sms' },
  { id: 'cli-014', nom: 'Station-service Ankorondrano', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Ankorondrano', ville: 'Antananarivo', contact: 'Service réception', telephone: '034 20 101 05', canalPrefere: 'sms' },
  { id: 'cli-015', nom: 'Station-service Andraharo', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Andraharo', ville: 'Antananarivo', contact: 'Service réception', telephone: '034 20 101 06', canalPrefere: 'sms' },
  { id: 'cli-016', nom: 'Station-service Ambanidia', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Ambanidia', ville: 'Antananarivo', contact: 'Service réception', telephone: '034 20 101 07', canalPrefere: 'sms' },
  { id: 'cli-017', nom: 'Station-service Talatamaty', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Talatamaty', ville: 'Antananarivo', contact: 'Service réception', telephone: '034 20 101 08', canalPrefere: 'sms' },
  { id: 'cli-018', nom: 'Station-service Ambohibao', ordonnateur: false, destinataire: true, nature: 'externe', adresse: 'Ambohibao', ville: 'Antananarivo', contact: 'Service réception', telephone: '034 20 101 09', canalPrefere: 'sms' },
  { id: 'cli-004', nom: 'Équipe commerciale', ordonnateur: true, destinataire: false, nature: 'interne', ville: 'Antananarivo', contact: 'Lova Rabemananjara', telephone: '034 11 222 33', email: 'commercial@ucodis.mg', canalPrefere: 'email' },
]
const CLE = 'fms-ucodis-clients'

const normaliser = (s: string) => s.trim().toLowerCase()
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Fiches enregistrées avant l'ajout des rôles : destinataires externes. */
function completer(c: Client): Client {
  return { ...c, ordonnateur: c.ordonnateur ?? false, destinataire: c.destinataire ?? (c.ordonnateur ? false : true), nature: c.nature ?? 'externe', canalPrefere: c.canalPrefere ?? 'sms' }
}

export const useClientsStore = defineStore('clients', () => {
  let initial = DEFAUT.map(c => ({ ...c }))
  try {
    const b = localStorage.getItem(CLE)
    if (b) { const lus = JSON.parse(b); if (Array.isArray(lus)) initial = (lus as Client[]).map(completer) }
  } catch { /* défaut */ }
  const clients = ref<Client[]>(initial)
  watch(clients, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })

  const getById = (id: string) => clients.value.find(c => c.id === id)
  const parNom = (nom?: string) => { const n = nom ? normaliser(nom) : ''; return n ? clients.value.find(c => normaliser(c.nom) === n) : undefined }
  /** Canal par défaut d'un destinataire connu, SMS sinon. */
  const canalPour = (nom?: string): CanalNotification => parNom(nom)?.canalPrefere ?? 'sms'

  /** Tiers qui peuvent demander un transport (services internes et clients externes). */
  const ordonnateurs = (nature?: NatureTiers) => clients.value.filter(c => c.ordonnateur && (!nature || c.nature === nature))
  /** Tiers qui peuvent recevoir une livraison. */
  const destinataires = () => clients.value.filter(c => c.destinataire)
  const listeOrdonnateurs = computed(() => ordonnateurs())
  const listeDestinataires = computed(() => destinataires())

  function controler(s: SaisieClient, ignorerId?: string): string | null {
    if (!s.nom?.trim()) return 'Indiquez le nom.'
    if (!s.ordonnateur && !s.destinataire) return 'Cochez au moins un rôle : ordonnateur, destinataire, ou les deux.'
    if (s.email?.trim() && !EMAIL.test(s.email.trim())) return "L'adresse e-mail n'est pas valide."
    if ((s.canalPrefere === 'email' || s.canalPrefere === 'sms_email') && !s.email?.trim()) return "Indiquez l'e-mail : les notifications partent par e-mail."
    if ((s.canalPrefere ?? 'sms') !== 'email' && !s.telephone?.trim()) return 'Indiquez le téléphone : les notifications partent par SMS.'
    if (s.telephone?.trim() && !/^[+\d][\d\s.-]{5,}$/.test(s.telephone.trim())) return "Le numéro de téléphone n'est pas valide."
    if (clients.value.some(c => c.id !== ignorerId && normaliser(c.nom) === normaliser(s.nom))) return 'Une fiche porte déjà ce nom.'
    return null
  }
  const nettoyer = (s: SaisieClient): SaisieClient => ({
    nom: s.nom.trim(), ordonnateur: !!s.ordonnateur, destinataire: !!s.destinataire, nature: s.nature ?? 'externe',
    adresse: s.adresse?.trim() || undefined, ville: s.ville?.trim() || undefined, contact: s.contact?.trim() || undefined,
    telephone: s.telephone?.trim() || undefined, email: s.email?.trim() || undefined, canalPrefere: s.canalPrefere ?? 'sms',
  })

  function creer(saisie: SaisieClient): Resultat & { id?: string } {
    const motif = controler(saisie); if (motif) return { ok: false, motif }
    let n = clients.value.length + 1
    while (clients.value.some(c => c.id === `cli-perso-${n}`)) n++
    const id = `cli-perso-${n}`
    clients.value.push({ ...nettoyer(saisie), id })
    return { ok: true, id }
  }
  function modifier(id: string, saisie: Partial<SaisieClient>): Resultat {
    const c = getById(id); if (!c) return { ok: false, motif: 'Fiche introuvable.' }
    const fusion = { ...c, ...saisie } as SaisieClient
    const motif = controler(fusion, id); if (motif) return { ok: false, motif }
    const ancienNom = c.nom
    if (saisie.nom && normaliser(saisie.nom) !== normaliser(ancienNom) && utilisations(c).length) return { ok: false, motif: `${ancienNom} est déjà utilisé (${utilisations(c).join(', ')}) : son nom ne peut plus changer.` }
    Object.assign(c, nettoyer(fusion))
    return { ok: true }
  }
  /** Où le tiers est cité : demandes de livraison, ordres de transport, tarifs, contraintes, écarts autorisés. */
  function utilisations(c: Client): string[] {
    const out: string[] = []
    const n = normaliser(c.nom)
    if (useCommandesStore().commandes.some(x => normaliser(x.destinataire) === n || normaliser(x.ordonnateurExterne ?? '') === n)) out.push('demandes de livraison')
    if (useVoyagesStore().voyages.some(v => v.etapes.some(e => normaliser(e.destinataire ?? '') === n))) out.push('ordres de transport')
    if (useTarifsTransportStore().tarifs.some(t => t.cible === 'client' && t.tiersId === c.id)) out.push('tarifs de transport')
    if (useContraintesLivraisonStore().contraintes.some(x => x.clientId === c.id)) out.push('contraintes de livraison')
    if (useControlesTransportStore().reglages.tolerances.some(x => x.clientId === c.id)) out.push('écarts autorisés')
    return out
  }
  /** Une fiche citée ailleurs ne se supprime pas. */
  function supprimer(id: string): Resultat {
    const c = getById(id); if (!c) return { ok: false, motif: 'Fiche introuvable.' }
    /* Un site rattaché au client le cite par son identifiant : la fiche reste. */
    const u = [...utilisations(c), ...(useSitesStore().sites.some(x => x.clientId === c.id) ? ['sites de livraison'] : [])]
    if (u.length) return { ok: false, motif: `${c.nom} est utilisé (${u.join(', ')}) : la fiche ne peut pas être supprimée.` }
    clients.value = clients.value.filter(x => x.id !== id)
    return { ok: true }
  }
  function reinitialiser() { clients.value = DEFAUT.map(c => ({ ...c })) }

  return { clients, getById, parNom, canalPour, ordonnateurs, destinataires, listeOrdonnateurs, listeDestinataires, creer, modifier, supprimer, utilisations, reinitialiser }
})
