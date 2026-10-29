import type { FleetStatusApi } from '@/modules/fleet/fleet-status/types/fleetStatus.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

/** What the fleet manager adds to the computed line of a vehicle, for one day. */
export interface FleetStatusNoteRow extends MockRow {
  date: string
  vehicleNo: string
  observation: string
  expectedBackOn: string | null
}

/** The lines of a day as they were when archived. */
export interface FleetStatusArchiveRow extends MockRow {
  date: string
  lines: FleetStatusApi[]
}

export const fleetStatusNotesCollection: CollectionDefinition<FleetStatusNoteRow> = {
  name: 'fleet-status-notes',
  seed: () => [
    {
      no: 'NOTE-00001',
      date: '2026-09-04',
      vehicleNo: 'VEH-009',
      observation: "Expertise de l'assureur prévue lundi ; devis de carrosserie demandé.",
      expectedBackOn: '2026-09-14',
      ...seedAudit
    }
  ],
  dateFields: ['date', 'expectedBackOn']
}

export const fleetStatusArchivesCollection: CollectionDefinition<FleetStatusArchiveRow> = {
  name: 'fleet-status-archives',
  seed: () => [],
  dateFields: ['date']
}

/**
 * A sending of the fleet status by e-mail. The demonstration has no mail server: the sending is
 * recorded here, with its recipients, and shown on the screen; nothing leaves the application.
 */
export interface FleetStatusDispatchRow extends MockRow {
  /** The day of the fleet status sent. */
  date: string
  recipients: string[]
  subject: string
  lineCount: number
  sentAt: string
  sentBy: string
}

export const fleetStatusDispatchesCollection: CollectionDefinition<FleetStatusDispatchRow> = {
  name: 'fleet-status-dispatches',
  seed: () => [],
  dateFields: ['date', 'sentAt']
}
