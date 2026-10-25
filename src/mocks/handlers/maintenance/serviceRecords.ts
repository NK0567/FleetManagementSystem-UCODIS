import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { ServiceRecordRow } from '../../fixtures/maintenance/serviceRecords'
import { stampCreated } from '../../http/crudResource'
import type { MockRequest } from '../../http/types'
import { sessionUser } from '../../http/types'

export function recordPassages(
  db: MockDatabase,
  passages: Pick<ServiceRecordRow, 'vehicleNo' | 'operationNo' | 'km' | 'date' | 'workOrderNo'>[],
  request: MockRequest
): ServiceRecordRow[] {
  return passages.map((passage) =>
    db.serviceRecords.insert(
      stampCreated(
        {
          ...passage,
          no: nextNo(
            db.serviceRecords.all().map((row) => row.no),
            'PAS-',
            5
          ),
          recordedBy: sessionUser(request).code
        },
        request
      )
    )
  )
}

/** The latest passage of each operation on each vehicle, keyed `vehicleNo operationNo`. */
export function lastPassages(db: MockDatabase): Map<string, ServiceRecordRow> {
  const latest = new Map<string, ServiceRecordRow>()
  for (const row of db.serviceRecords.all()) {
    const key = `${row.vehicleNo} ${row.operationNo}`
    const current = latest.get(key)
    if (
      !current ||
      row.date > current.date ||
      (row.date === current.date && (row.km ?? 0) > (current.km ?? 0))
    ) {
      latest.set(key, row)
    }
  }
  return latest
}
