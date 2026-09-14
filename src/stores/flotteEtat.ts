import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LigneEtatFlotte, GroupeEtatFlotte, CodeEtatFlotte } from '../types'

export interface DefinitionEtatFlotte { code: CodeEtatFlotte; groupe: GroupeEtatFlotte; libelle: string }

/** Les treize codes, repris tels quels des documents de référence du socle FMS (US 2.2.4). */
export const ETATS_FLOTTE: DefinitionEtatFlotte[] = [
  { code: 'DEP-PRV', groupe: 'operationnel', libelle: 'Départ prévu' },
  { code: 'DEP-REA', groupe: 'operationnel', libelle: 'Départ réalisé' },
  { code: 'RET-VID', groupe: 'operationnel', libelle: 'Retour à vide' },
  { code: 'RET-CHG', groupe: 'operationnel', libelle: 'Retour chargé' },
  { code: 'ANN-VYG', groupe: 'operationnel', libelle: 'Voyage annulé' },
  { code: 'TR-LIV', groupe: 'transit', libelle: 'En transit vers livraison' },
  { code: 'TR-CHG', groupe: 'transit', libelle: 'En transit vers chargement' },
  { code: 'TR-VID', groupe: 'transit', libelle: 'En transit à vide' },
  { code: 'TR-RET', groupe: 'transit', libelle: 'En transit retour base' },
  { code: 'ATT-CHG', groupe: 'attente', libelle: 'En attente de chargement' },
  { code: 'ATT-LIV', groupe: 'attente', libelle: 'En attente de livraison' },
  { code: 'ATT-DEP', groupe: 'attente', libelle: 'En attente de départ' },
  { code: 'ATT-ADM', groupe: 'attente', libelle: 'En attente administrative' },
]
export const LIB_GROUPE_ETAT: Record<GroupeEtatFlotte, string> = {
  operationnel: 'Opérationnel', transit: 'En transit', attente: 'En attente',
}
export function libelleEtat(c: CodeEtatFlotte) { return ETATS_FLOTTE.find(e => e.code === c)?.libelle ?? c }
export function groupeDeLEtat(c: CodeEtatFlotte) { return ETATS_FLOTTE.find(e => e.code === c)?.groupe ?? 'attente' }

/**
 * État de flotte du jour, dérivé des véhicules, attelages, affectations et
 * voyages déjà en place · le statut ne se ressaisit jamais, il se déduit,
 * comme partout ailleurs dans le projet.
 */
export const useFlotteEtatStore = defineStore('flotteEtat', () => {
  const lignes = ref<LigneEtatFlotte[]>([
    { vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA', chauffeurNom: 'Solofo Rakotomanga',
      etat: 'ATT-ADM', codeIndispo: 'DOC', motifIndispo: 'Carte grise en attente de renouvellement',
      observation: 'Dossier déposé à la direction des transports le 02/09/2026, délai annoncé 15 jours.' },
    { vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA', chauffeurNom: 'Mamy Andrianaivo',
      etat: 'TR-LIV', voyageRef: 'VOY-2026-0149' },
    { vehiculeId: 'v-tr-3', vehiculePlaque: '4023 TBA', chauffeurNom: 'Tiana Rasolofoson',
      etat: 'DEP-PRV', voyageRef: 'VOY-2026-0150' },
    { vehiculeId: 'v-tr-4', vehiculePlaque: '4024 TBA', chauffeurNom: 'Jaona Ratsimbazafy',
      etat: 'ATT-ADM', codeIndispo: 'MEC', motifIndispo: 'Casse boîte de vitesse', remiseEnServicePrevue: '2026-09-15',
      observation: 'Pièce commandée chez le concessionnaire Toyota Antananarivo, livraison attendue sous 5 jours.' },
    { vehiculeId: 'v-tr-9', vehiculePlaque: '4029 TBA', chauffeurNom: undefined,
      etat: 'ATT-ADM', codeIndispo: 'ACC', motifIndispo: 'Accident, expertise en cours', remiseEnServicePrevue: '2026-09-25',
      observation: 'Expert ARO Madagascar attendu le 12/09/2026 · dossier SIN-2026-004.' },
    { vehiculeId: 'v-tr-7', vehiculePlaque: '4027 TBA', chauffeurNom: 'Nomena Andriantsoa',
      etat: 'RET-VID' },
  ])

  const dateDuJour = ref('2026-09-08')

  const parGroupe = (g: GroupeEtatFlotte) => lignes.value.filter(l => groupeDeLEtat(l.etat) === g)
  const operationnels = computed(() => parGroupe('operationnel').filter(l => !l.codeIndispo))
  const enTransit = computed(() => parGroupe('transit'))
  const enAttente = computed(() => parGroupe('attente').filter(l => !l.codeIndispo))
  const immobilises = computed(() => lignes.value.filter(l => !!l.codeIndispo))

  return { lignes, dateDuJour, operationnels, enTransit, enAttente, immobilises, parGroupe }
})
