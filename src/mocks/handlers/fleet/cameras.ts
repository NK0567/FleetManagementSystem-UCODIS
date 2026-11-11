import type { MockDatabase } from '../../db/database'
import { DEFAULT_FLEET_SETTINGS } from '@/modules/fleet/fleet-settings/domain/fleetSettings'
import { fleetSettings } from './settings'

/** Cameras fitted on each vehicle, and how many of them are connected (in service). */
export function cameraCounts(db: MockDatabase): Map<string, { fitted: number; connected: number }> {
  const cameraTypes = new Set(
    db.equipmentTypes
      .all()
      .filter((type) => type.capability === 'camera')
      .map((type) => type.no)
  )
  const counts = new Map<string, { fitted: number; connected: number }>()
  for (const item of db.vehicleEquipment.all()) {
    if (!cameraTypes.has(item.equipmentTypeNo) || item.state === 'uninstalled') continue
    const entry = counts.get(item.vehicleNo) ?? { fitted: 0, connected: 0 }
    entry.fitted += 1
    if (item.state === 'operational') entry.connected += 1
    counts.set(item.vehicleNo, entry)
  }
  return counts
}

export function minimumCameras(db: MockDatabase): number {
  return (
    fleetSettings(db).telematics.minimumCameras ?? DEFAULT_FLEET_SETTINGS.telematics.minimumCameras
  )
}

/** « 4 / 5 »: connected cameras over the larger of the minimum and those fitted. */
export function cameraText(
  count: { fitted: number; connected: number } | undefined,
  minimum: number
): string {
  if (!count) return ''
  return `${count.connected} / ${Math.max(minimum, count.fitted)}`
}

/** Below the minimum, or with one fitted camera out of service. */
export function camerasShort(
  count: { fitted: number; connected: number } | undefined,
  minimum: number
): boolean {
  return !!count && (count.connected < minimum || count.connected < count.fitted)
}
