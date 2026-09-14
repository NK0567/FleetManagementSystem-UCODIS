import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { EntreeJournal } from '../types'

/**
 * Journal d'activité.
 * Cahier des charges, module 9 : « Accès sécurisé : droits d'accès, audit
 * et traçabilité des modifications ».
 */
const SEED: EntreeJournal[] = [
  { id: 'j-012', horodatage: '2026-09-03 08:12', auteur: 'Hery Andriamalala', action: 'Habilitation accordée', cible: 'Fanomezantsoa Rakotonirina', detail: 'Formation conduite préventive validée' },
  { id: 'j-011', horodatage: '2026-09-02 16:40', auteur: 'Système', action: 'Alerte échéance', cible: 'Tsiory Rabearison', detail: 'Visite médicale expirant dans 21 jours' },
  { id: 'j-010', horodatage: '2026-09-02 14:05', auteur: 'Faniry Rakotoarisoa', action: 'Compte créé', cible: 'Mihaja Ranaivoson', detail: 'Rôle aide conducteur' },
  { id: 'j-009', horodatage: '2026-09-01 11:22', auteur: 'Hery Andriamalala', action: 'Habilitation retirée', cible: 'Jean-Luc Razanamalala', detail: 'Visite médicale expirée' },
  { id: 'j-008', horodatage: '2026-09-01 09:47', auteur: 'Hery Andriamalala', action: 'Document déposé', cible: 'Mamy Andrianaivo', detail: 'Permis de conduire, catégorie CE' },
  { id: 'j-007', horodatage: '2026-08-29 17:03', auteur: 'Système', action: 'Alerte échéance', cible: 'Nomena Andriantsoa', detail: 'Permis de conduire expiré depuis 18 jours' },
  { id: 'j-006', horodatage: '2026-08-28 10:15', auteur: 'Faniry Rakotoarisoa', action: 'Paramètre modifié', cible: 'Seuil d\u2019alerte', detail: 'Maintenu à 30 jours' },
  { id: 'j-005', horodatage: '2026-08-27 15:31', auteur: 'Miora Randrianasolo', action: 'Connexion', cible: 'CLI001' },
  { id: 'j-004', horodatage: '2026-08-26 08:02', auteur: 'Tojo Rasoanaivo', action: 'Connexion', cible: 'MNT001' },
  { id: 'j-003', horodatage: '2026-08-25 13:58', auteur: 'Faniry Rakotoarisoa', action: 'Service créé', cible: 'Équipe conduite', detail: 'Rattachée au Service Flotte' },
]

export const useJournalStore = defineStore('journal', () => {
  const liste = ref<EntreeJournal[]>(SEED)
  return { liste }
})
