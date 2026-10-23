import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface ModuleToggleRow extends MockRow {
  active: boolean
}

export interface ModuleToggleDefinition {
  no: string
  group: 'fleet' | 'maintenance'
  order: number
  /** Features hidden from every profile while the toggle is off. */
  features: readonly string[]
}

export const MODULE_TOGGLE_CATALOG: readonly ModuleToggleDefinition[] = [
  { no: 'live-map', group: 'fleet', order: 10, features: ['LIVEMAP'] },
  { no: 'telematics', group: 'fleet', order: 20, features: ['TELEMATICS', 'TELEMATICSEVENTTYPE'] },
  { no: 'trips', group: 'fleet', order: 30, features: ['TRIP', 'ROUTETEMPLATE'] },
  { no: 'compliance', group: 'fleet', order: 40, features: ['ROUTEDEVIATION', 'DEVIATIONTYPE'] },
  {
    no: 'fuel',
    group: 'fleet',
    order: 50,
    features: ['FUELREFILL', 'FUELCONSUMPTION', 'FUELCARD']
  },
  { no: 'fleet-status', group: 'fleet', order: 60, features: ['FLEETSTATUS'] },
  { no: 'checks', group: 'fleet', order: 70, features: ['ROADCHECKLIST', 'INSPECTION'] },
  { no: 'departures', group: 'fleet', order: 80, features: ['DEPARTUREAUTHORIZATION'] },
  { no: 'insurance', group: 'fleet', order: 90, features: ['INSURANCEPOLICY', 'CLAIM'] },
  { no: 'documents', group: 'fleet', order: 100, features: ['DOCUMENT', 'COMPANYDOCUMENT'] },
  { no: 'fleet-settings', group: 'fleet', order: 110, features: ['FLEETSETTINGS'] },
  { no: 'fleet-drivers', group: 'fleet', order: 120, features: ['DRIVER'] },
  { no: 'sites', group: 'fleet', order: 130, features: ['SITE'] },
  { no: 'workshop-load', group: 'maintenance', order: 210, features: ['WORKSHOPLOAD'] },
  { no: 'service-due', group: 'maintenance', order: 220, features: ['SERVICEDUE'] },
  { no: 'downtimes', group: 'maintenance', order: 230, features: ['DOWNTIME'] },
  { no: 'reliability', group: 'maintenance', order: 240, features: ['RELIABILITY'] },
  { no: 'mobile-team', group: 'maintenance', order: 250, features: ['MOBILEINTERVENTION'] },
  { no: 'purchasing', group: 'maintenance', order: 260, features: ['PURCHASEREQUEST', 'STOCKITEM'] }
]

export const moduleTogglesCollection: CollectionDefinition<ModuleToggleRow> = {
  name: 'module-toggles',
  seed: () => MODULE_TOGGLE_CATALOG.map((toggle) => ({ no: toggle.no, active: true, ...seedAudit }))
}
