import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Client {
  id: string
  nom: string
  ville?: string
  contact?: string
  telephone?: string
}

/**
 * Clients de référence, repris des noms déjà utilisés dans les voyages et
 * trajets de référence · une hypothèse illustrative, à confirmer avec
 * UCODIS (aucun document ne nomme de client précis).
 */
export const useClientsStore = defineStore('clients', () => {
  const clients = ref<Client[]>([
    { id: 'cli-001', nom: 'Jumbo Score Tanjombato', ville: 'Antananarivo', contact: 'Service réception', telephone: '020 22 123 45' },
    { id: 'cli-002', nom: 'Leader Price Antsirabe', ville: 'Antsirabe', contact: 'Service réception', telephone: '020 44 567 89' },
    { id: 'cli-003', nom: 'Shoprite Mahajanga', ville: 'Mahajanga', contact: 'Service réception', telephone: '020 62 345 67' },
  ])

  const getById = (id: string) => clients.value.find(c => c.id === id)

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

  return { clients, getById, creer, modifier, supprimer }
})
