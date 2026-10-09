import { defineStore } from 'pinia'
import { ref } from 'vue'

export type CanalNotification = 'sms' | 'email' | 'sms_email'
export const LIB_CANAL: Record<CanalNotification, string> = { sms: 'SMS', email: 'E-mail', sms_email: 'SMS et e-mail' }

export interface Client {
  id: string
  nom: string
  ville?: string
  contact?: string
  telephone?: string
  email?: string
  /** Canal par défaut des notifications de livraison de ce client ; une
   *  commande peut le préciser autrement (livraison chez un tiers, par ex.). */
  canalPrefere?: CanalNotification
}

/**
 * Clients de référence, repris des noms déjà utilisés dans les voyages et
 * trajets de référence · une hypothèse illustrative, à confirmer avec
 * UCODIS (aucun document ne nomme de client précis).
 */
export const useClientsStore = defineStore('clients', () => {
  const clients = ref<Client[]>([
    { id: 'cli-001', nom: 'Jumbo Score Tanjombato', ville: 'Antananarivo', contact: 'Service réception', telephone: '020 22 123 45', email: 'reception@jumboscore-tnj.mg', canalPrefere: 'sms_email' },
    { id: 'cli-002', nom: 'Leader Price Antsirabe', ville: 'Antsirabe', contact: 'Service réception', telephone: '020 44 567 89', email: 'contact@leaderprice-antsirabe.mg', canalPrefere: 'email' },
    { id: 'cli-003', nom: 'Shoprite Mahajanga', ville: 'Mahajanga', contact: 'Service réception', telephone: '020 62 345 67', canalPrefere: 'sms' },
  ])

  const getById = (id: string) => clients.value.find(c => c.id === id)
  /** Canal par défaut d'un destinataire connu, SMS sinon. */
  const canalPour = (nom?: string): CanalNotification => clients.value.find(c => c.nom === nom)?.canalPrefere ?? 'sms'

  let prochainId = clients.value.length + 1
  function creer(saisie: Omit<Client, 'id'>) {
    const id = `cli-perso-${prochainId++}`
    clients.value.push({ ...saisie, id })
    return id
  }
  function modifier(id: string, saisie: Partial<Omit<Client, 'id'>>) {
    const c = getById(id)
    if (c) Object.assign(c, saisie)
  }
  function supprimer(id: string) {
    const i = clients.value.findIndex(c => c.id === id)
    if (i >= 0) clients.value.splice(i, 1)
  }

  return { clients, getById, creer, modifier, supprimer, canalPour }
})
