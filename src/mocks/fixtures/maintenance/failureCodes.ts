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
    name: 'Circuit de refroidissement',
    kind: 'subsystem',
    parentNo: 'POWERTRAIN',
    competenceNo: 'MECHANICAL',
    active: true
  },
  {
    no: 'BRAKES',
    name: 'Système de freinage',
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
    name: 'Pneumatiques, roues et roulements',
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
    name: 'Châssis, tôlerie et sécurités',
    kind: 'subsystem',
    parentNo: 'BODY',
    competenceNo: 'MECHANICAL',
    active: true
  },
  {
    no: 'TANK',
    name: 'Citerne et sécurité',
    kind: 'subsystem',
    parentNo: 'LOADING',
    competenceNo: 'TANKER',
    active: true
  },
  {
    no: 'ENGINE-INJECTION',
    name: 'Injection',
    kind: 'component',
    parentNo: 'ENGINE',
    competenceNo: null,
    active: true
  },
  {
    no: 'ENGINE-POMPE-DE-GAVAGE',
    name: 'Pompe de gavage',
    kind: 'component',
    parentNo: 'ENGINE',
    competenceNo: null,
    active: true
  },
  {
    no: 'ENGINE-TURBO',
    name: 'Turbo',
    kind: 'component',
    parentNo: 'ENGINE',
    competenceNo: null,
    active: true
  },
  {
    no: 'ENGINE-REFROIDISSEMENT-MOTEUR',
    name: 'Refroidissement moteur',
    kind: 'component',
    parentNo: 'ENGINE',
    competenceNo: null,
    active: true
  },
  {
    no: 'TRANSMISSION-BOITE-DE-VITESSES',
    name: 'Boîte de vitesses',
    kind: 'component',
    parentNo: 'TRANSMISSION',
    competenceNo: null,
    active: true
  },
  {
    no: 'TRANSMISSION-EMBRAYAGE',
    name: 'Embrayage',
    kind: 'component',
    parentNo: 'TRANSMISSION',
    competenceNo: null,
    active: true
  },
  {
    no: 'TRANSMISSION-PONT',
    name: 'Pont',
    kind: 'component',
    parentNo: 'TRANSMISSION',
    competenceNo: null,
    active: true
  },
  {
    no: 'TRANSMISSION-ARBRE-DE-TRANSMISSION',
    name: 'Arbre de transmission',
    kind: 'component',
    parentNo: 'TRANSMISSION',
    competenceNo: null,
    active: true
  },
  {
    no: 'AIR-COMPRESSEUR',
    name: 'Compresseur',
    kind: 'component',
    parentNo: 'AIR',
    competenceNo: null,
    active: true
  },
  {
    no: 'AIR-DESSICCATEUR',
    name: 'Dessiccateur',
    kind: 'component',
    parentNo: 'AIR',
    competenceNo: null,
    active: true
  },
  {
    no: 'AIR-REGULATEUR',
    name: 'Régulateur',
    kind: 'component',
    parentNo: 'AIR',
    competenceNo: null,
    active: true
  },
  {
    no: 'AIR-REPARTITEUR',
    name: 'Répartiteur',
    kind: 'component',
    parentNo: 'AIR',
    competenceNo: null,
    active: true
  },
  {
    no: 'AIR-TUYAUX',
    name: 'Tuyaux',
    kind: 'component',
    parentNo: 'AIR',
    competenceNo: null,
    active: true
  },
  {
    no: 'FUEL-SYSTEM-POMPE',
    name: 'Pompe',
    kind: 'component',
    parentNo: 'FUEL-SYSTEM',
    competenceNo: null,
    active: true
  },
  {
    no: 'FUEL-SYSTEM-INJECTEURS',
    name: 'Injecteurs',
    kind: 'component',
    parentNo: 'FUEL-SYSTEM',
    competenceNo: null,
    active: true
  },
  {
    no: 'FUEL-SYSTEM-FILTRES',
    name: 'Filtres',
    kind: 'component',
    parentNo: 'FUEL-SYSTEM',
    competenceNo: null,
    active: true
  },
  {
    no: 'BRAKES-PLAQUETTES',
    name: 'Plaquettes',
    kind: 'component',
    parentNo: 'BRAKES',
    competenceNo: null,
    active: true
  },
  {
    no: 'BRAKES-REPARTITEUR',
    name: 'Répartiteur',
    kind: 'component',
    parentNo: 'BRAKES',
    competenceNo: null,
    active: true
  },
  {
    no: 'BRAKES-RECEPTEUR',
    name: 'Récepteur',
    kind: 'component',
    parentNo: 'BRAKES',
    competenceNo: null,
    active: true
  },
  {
    no: 'ELECTRONICS-DEMARREUR',
    name: 'Démarreur',
    kind: 'component',
    parentNo: 'ELECTRONICS',
    competenceNo: null,
    active: true
  },
  {
    no: 'ELECTRONICS-ALTERNATEUR',
    name: 'Alternateur',
    kind: 'component',
    parentNo: 'ELECTRONICS',
    competenceNo: null,
    active: true
  },
  {
    no: 'ELECTRONICS-BATTERIE',
    name: 'Batterie',
    kind: 'component',
    parentNo: 'ELECTRONICS',
    competenceNo: null,
    active: true
  },
  {
    no: 'ELECTRONICS-CABLAGE',
    name: 'Câblage',
    kind: 'component',
    parentNo: 'ELECTRONICS',
    competenceNo: null,
    active: true
  },
  {
    no: 'ELECTRONICS-CAPTEURS',
    name: 'Capteurs',
    kind: 'component',
    parentNo: 'ELECTRONICS',
    competenceNo: null,
    active: true
  },
  {
    no: 'ELECTRONICS-ECLAIRAGE',
    name: 'Éclairage',
    kind: 'component',
    parentNo: 'ELECTRONICS',
    competenceNo: null,
    active: true
  },
  {
    no: 'ELECTRONICS-GPS',
    name: 'GPS',
    kind: 'component',
    parentNo: 'ELECTRONICS',
    competenceNo: null,
    active: true
  },
  {
    no: 'ELECTRONICS-CAMERAS',
    name: 'Caméras',
    kind: 'component',
    parentNo: 'ELECTRONICS',
    competenceNo: null,
    active: true
  },
  {
    no: 'STEERING-POMPE-ASSISTEE',
    name: 'Pompe assistée',
    kind: 'component',
    parentNo: 'STEERING',
    competenceNo: null,
    active: true
  },
  {
    no: 'STEERING-RESSORTS',
    name: 'Ressorts',
    kind: 'component',
    parentNo: 'STEERING',
    competenceNo: null,
    active: true
  },
  {
    no: 'STEERING-BALLONS-DE-SUSPENSION',
    name: 'Ballons de suspension',
    kind: 'component',
    parentNo: 'STEERING',
    competenceNo: null,
    active: true
  },
  {
    no: 'WHEELS-MOYEU',
    name: 'Moyeu',
    kind: 'component',
    parentNo: 'WHEELS',
    competenceNo: null,
    active: true
  },
  {
    no: 'WHEELS-ROULEMENT-AVANT',
    name: 'Roulement avant',
    kind: 'component',
    parentNo: 'WHEELS',
    competenceNo: null,
    active: true
  },
  {
    no: 'WHEELS-ROULEMENT-ARRIERE',
    name: 'Roulement arrière',
    kind: 'component',
    parentNo: 'WHEELS',
    competenceNo: null,
    active: true
  },
  {
    no: 'WHEELS-PNEUMATIQUE',
    name: 'Pneumatique',
    kind: 'component',
    parentNo: 'WHEELS',
    competenceNo: null,
    active: true
  },
  {
    no: 'CHASSIS-REDRESSAGE',
    name: 'Redressage',
    kind: 'component',
    parentNo: 'CHASSIS',
    competenceNo: null,
    active: true
  },
  {
    no: 'CHASSIS-PONCAGE',
    name: 'Ponçage',
    kind: 'component',
    parentNo: 'CHASSIS',
    competenceNo: null,
    active: true
  },
  {
    no: 'CHASSIS-PEINTURE',
    name: 'Peinture',
    kind: 'component',
    parentNo: 'CHASSIS',
    competenceNo: null,
    active: true
  },
  {
    no: 'CHASSIS-DISPOSITIFS-DE-SECURITE',
    name: 'Dispositifs de sécurité',
    kind: 'component',
    parentNo: 'CHASSIS',
    competenceNo: null,
    active: true
  },
  {
    no: 'COOLING-RADIATEURS',
    name: 'Radiateurs',
    kind: 'component',
    parentNo: 'COOLING',
    competenceNo: null,
    active: true
  },
  {
    no: 'COOLING-TUYAUTERIES',
    name: 'Tuyauteries',
    kind: 'component',
    parentNo: 'COOLING',
    competenceNo: null,
    active: true
  },
  {
    no: 'TANK-VANNES',
    name: 'Vannes',
    kind: 'component',
    parentNo: 'TANK',
    competenceNo: null,
    active: true
  },
  {
    no: 'TANK-SOUPAPES',
    name: 'Soupapes',
    kind: 'component',
    parentNo: 'TANK',
    competenceNo: null,
    active: true
  },
  {
    no: 'TANK-SYSTEME-DE-SECURITE',
    name: 'Système de sécurité',
    kind: 'component',
    parentNo: 'TANK',
    competenceNo: null,
    active: true
  },
  {
    no: 'TANK-CALES',
    name: 'Cales',
    kind: 'component',
    parentNo: 'TANK',
    competenceNo: null,
    active: true
  },
  {
    no: 'TANK-EXTINCTEUR',
    name: 'Extincteur',
    kind: 'component',
    parentNo: 'TANK',
    competenceNo: null,
    active: true
  },
  {
    no: 'TANK-EQUIPEMENTS-DE-PROTECTION',
    name: 'Équipements de protection',
    kind: 'component',
    parentNo: 'TANK',
    competenceNo: null,
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
    no: 'FAIL-TO-START',
    name: 'Défaut de démarrage',
    kind: 'mode',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'SPURIOUS-STOP',
    name: 'Arrêt intempestif',
    kind: 'mode',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'VIBRATION',
    name: 'Vibrations',
    kind: 'mode',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'NOISE',
    name: 'Bruit anormal',
    kind: 'mode',
    parentNo: null,
    competenceNo: null,
    active: true
  },
  {
    no: 'ABNORMAL-READING',
    name: 'Mesure anormale',
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
