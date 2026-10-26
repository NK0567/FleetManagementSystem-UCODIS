import type { FailureCodeKind } from '@/modules/maintenance/failure-codes/types/failureCode.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface FailureCodeRow extends MockRow {
  name: string
  kind: FailureCodeKind
  parentNo: string | null
  competenceNo: string | null
  active: boolean
}

const SEED: Omit<FailureCodeRow, keyof typeof seedAudit>[] = [
  {
    no: 'POWERTRAIN',
    name: 'Groupe motopropulseur',
    kind: 'system',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'RUNNING-GEAR',
    name: 'Freinage et liaison au sol',
    kind: 'system',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'ELECTRICS',
    name: 'Équipement électrique',
    kind: 'system',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'BODY',
    name: 'Structure et carrosserie',
    kind: 'system',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'LOADING',
    name: 'Équipement de chargement',
    kind: 'system',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'ENGINE',
    name: 'Moteur',
    kind: 'subsystem',
    parentNo: 'POWERTRAIN',
    competenceNo: 'MECHANICAL',
    active: true
  },
  {
    no: 'TRANSMISSION',
    name: 'Transmission',
    kind: 'subsystem',
    parentNo: 'POWERTRAIN',
    competenceNo: 'MECHANICAL',
    active: true
  },
  {
    no: 'AIR',
    name: "Circuit d'air",
    kind: 'subsystem',
    parentNo: 'POWERTRAIN',
    competenceNo: 'MECHANICAL',
    active: true
  },
  {
    no: 'FUEL-SYSTEM',
    name: 'Circuit carburant',
    kind: 'subsystem',
    parentNo: 'POWERTRAIN',
    competenceNo: 'MECHANICAL',
    active: true
  },
  {
    no: 'COOLING',
    name: 'Refroidissement',
    kind: 'subsystem',
    parentNo: 'POWERTRAIN',
    competenceNo: 'MECHANICAL',
    active: true
  },
  {
    no: 'BRAKES',
    name: 'Freinage',
    kind: 'subsystem',
    parentNo: 'RUNNING-GEAR',
    competenceNo: 'MECHANICAL',
    active: true
  },
  {
    no: 'STEERING',
    name: 'Direction et suspension',
    kind: 'subsystem',
    parentNo: 'RUNNING-GEAR',
    competenceNo: 'MECHANICAL',
    active: true
  },
  {
    no: 'WHEELS',
    name: 'Roues et roulements',
    kind: 'subsystem',
    parentNo: 'RUNNING-GEAR',
    competenceNo: 'TYRES',
    active: true
  },
  {
    no: 'ELECTRONICS',
    name: 'Électricité et électronique',
    kind: 'subsystem',
    parentNo: 'ELECTRICS',
    competenceNo: 'ELECTRICAL',
    active: true
  },
  {
    no: 'CHASSIS',
    name: 'Châssis et tôlerie',
    kind: 'subsystem',
    parentNo: 'BODY',
    competenceNo: 'MECHANICAL',
    active: true
  },
  {
    no: 'TANK',
    name: 'Citerne et équipements de chargement',
    kind: 'subsystem',
    parentNo: 'LOADING',
    competenceNo: 'TANKER',
    active: true
  },
  {
    no: 'LEAK',
    name: 'Fuite',
    kind: 'mode',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'JAM',
    name: 'Blocage',
    kind: 'mode',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'BREAKAGE',
    name: 'Rupture',
    kind: 'mode',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'POWER-LOSS',
    name: 'Perte de puissance',
    kind: 'mode',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'OVERHEATING',
    name: 'Surchauffe',
    kind: 'mode',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'ELECTRICAL-FAULT',
    name: 'Défaillance électrique',
    kind: 'mode',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'WEAR',
    name: 'Usure excessive',
    kind: 'mode',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'NOT-WORKING',
    name: 'Non fonctionnel',
    kind: 'mode',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'DESIGN',
    name: 'Défaut de conception',
    kind: 'cause',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'SUPPLIER',
    name: 'Défaut fournisseur',
    kind: 'cause',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'HUMAN-ERROR',
    name: 'Erreur humaine',
    kind: 'cause',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'ENVIRONMENT',
    name: 'Conditions environnementales',
    kind: 'cause',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'POOR-MAINTENANCE',
    name: 'Maintenance insuffisante',
    kind: 'cause',
    parentNo: null,
    competenceNo: null,
    active: true
  }
]

export const failureCodesCollection: CollectionDefinition<FailureCodeRow> = {
  name: 'failure-codes',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
