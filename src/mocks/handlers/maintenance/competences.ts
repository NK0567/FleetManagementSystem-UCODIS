import type { CompetenceApi } from '@/modules/maintenance/competences/types/competence.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { CompetenceRow } from '../../fixtures/maintenance/competences'
import { registerCrudResource } from '../../http/crudResource'
import {
  readAll,
  readBoolean,
  readCode,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { conflict } from '../../http/errors'
import type { MockRouter } from '../../http/router'
import { MAINTENANCE_MESSAGES } from './messages'

type Fields = Omit<CompetenceRow, 'no' | keyof AuditFields>

export function competencesApi(db: MockDatabase): CompetenceApi[] {
  return db.competences.all().map((row) => ({
    ...row,
    hourlyRate: row.hourlyRate ?? null,
    technicianCount: db.technicians
      .all()
      .filter((technician) => technician.competences.includes(row.no)).length
  }))
}

export function registerCompetencesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    active: (input) => readBoolean(input, 'active', true),
    hourlyRate: (input) => readNumber(input, 'hourlyRate', { min: 0, max: 1_000_000 })
  }

  registerCrudResource(router, {
    basePath: '/maintenance/competences',
    feature: 'COMPETENCE',
    collection: db.competences,
    list: () => competencesApi(db),
    searchColumns: ['no', 'name'],
    create: (input) => ({
      no: readCode(input),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: (existing) => {
      const used =
        db.technicians.all().some((technician) => technician.competences.includes(existing.no)) ||
        db.failureCodes.all().some((code) => code.competenceNo === existing.no)
      if (used) throw conflict(MAINTENANCE_MESSAGES.competenceInUse)
    }
  })
}
