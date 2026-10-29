import type { PlanningReasonKind } from '@/modules/planning/reasons/types/planningReason.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface PlanningReasonRow extends MockRow {
  name: string
  kind: PlanningReasonKind
  active: boolean
}

const SEED: Omit<PlanningReasonRow, keyof typeof seedAudit>[] = [
  {
    no: 'CXL-CUSTOMER',
    name: 'Demande du client',
    kind: 'cancellation',
    active: true
  },
  {
    no: 'CXL-INCIDENT',
    name: 'Incident sur l’ordre',
    kind: 'cancellation',
    active: true
  },
  {
    no: 'CXL-VEHICLE',
    name: 'Véhicule indisponible',
    kind: 'cancellation',
    active: true
  },
  {
    no: 'CXL-STOCK',
    name: 'Produit indisponible au dépôt',
    kind: 'cancellation',
    active: true
  },
  {
    no: 'REJ-INCOMPLETE',
    name: 'Demande incomplète',
    kind: 'request_rejection',
    active: true
  },
  {
    no: 'REJ-DUPLICATE',
    name: 'Demande en double',
    kind: 'request_rejection',
    active: true
  },
  {
    no: 'REJ-ZONE',
    name: 'Destination non desservie',
    kind: 'request_rejection',
    active: true
  },
  {
    no: 'RFS-DAMAGED',
    name: 'Marchandise endommagée',
    kind: 'delivery_refusal',
    active: true
  },
  {
    no: 'RFS-NOT-ORDERED',
    name: 'Marchandise non commandée',
    kind: 'delivery_refusal',
    active: true
  },
  {
    no: 'RFS-LATE',
    name: 'Livraison hors délai',
    kind: 'delivery_refusal',
    active: true
  },
  {
    no: 'UNV-CLOSED',
    name: 'Établissement fermé',
    kind: 'unavailability',
    active: true
  },
  {
    no: 'UNV-NO-STAFF',
    name: 'Personne pour réceptionner',
    kind: 'unavailability',
    active: true
  },
  {
    no: 'UNV-NO-ROOM',
    name: 'Plus de place pour stocker',
    kind: 'unavailability',
    active: true
  },
  {
    no: 'NCF-QUANTITY',
    name: 'Quantité chargée différente',
    kind: 'nonconformity',
    active: true
  },
  {
    no: 'NCF-PACKAGING',
    name: 'Emballage abîmé',
    kind: 'nonconformity',
    active: true
  },
  {
    no: 'NCF-PRODUCT',
    name: 'Produit différent',
    kind: 'nonconformity',
    active: true
  },
  {
    no: 'PST-ACCESS',
    name: 'Accès impossible',
    kind: 'postponement',
    active: true
  },
  {
    no: 'PST-CUSTOMER',
    name: 'Report demandé par le destinataire',
    kind: 'postponement',
    active: true
  },
  {
    no: 'PST-TIME',
    name: 'Fin de journée atteinte',
    kind: 'postponement',
    active: true
  },
  {
    no: 'CST-QUANTITY',
    name: 'Quantité reçue contestée',
    kind: 'contestation',
    active: true
  },
  {
    no: 'CST-DAMAGE',
    name: "Marchandise abîmée à l'arrivée",
    kind: 'contestation',
    active: true
  },
  {
    no: 'CST-MISSING',
    name: 'Produit manquant',
    kind: 'contestation',
    active: true
  },
  {
    no: 'PRT-DAMAGE',
    name: 'Marchandise abîmée',
    kind: 'protest',
    active: true
  },
  {
    no: 'PRT-SHORT',
    name: 'Quantité manquante',
    kind: 'protest',
    active: true
  },
  {
    no: 'PRT-DELAY',
    name: 'Retard de livraison',
    kind: 'protest',
    active: true
  }
]

export const planningReasonsCollection: CollectionDefinition<PlanningReasonRow> = {
  name: 'planning-reasons',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
