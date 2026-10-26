import type { TechnicianApi } from '@/modules/maintenance/technicians/types/technician.types'
import { employeeFullName, isOnStaff } from '@/modules/hr/employees/domain/employee'
import type { MockDatabase } from '../../db/database'
import { registerCrudResource } from '../../http/crudResource'
import { unprocessable } from '../../http/errors'
import { readBoolean, readStringList } from '../../http/input'
import { requireReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { MAINTENANCE_MESSAGES } from './messages'

export function techniciansApi(db: MockDatabase): TechnicianApi[] {
  const positions = new Map(db.jobPositions.all().map((position) => [position.no, position.name]))
  const competences = new Map(db.competences.all().map((item) => [item.no, item.name]))
  return db.technicians.all().map((row) => {
    const employee = db.employees.find(row.no)
    return {
      ...row,
      fullName: employee ? employeeFullName(employee) : row.no,
      jobPositionName: employee ? (positions.get(employee.jobPositionNo) ?? '') : '',
      competenceNames: row.competences.map((code) => competences.get(code) ?? code).join(', ')
    }
  })
}

/** A technician is an HR employee on staff; the workshop only adds what they can repair. */
export function registerTechniciansHandlers(router: MockRouter, db: MockDatabase): void {
  function readCompetences(input: Record<string, unknown>): string[] {
    const codes = [...new Set(readStringList(input, 'competences'))]
    if (!codes.length) throw unprocessable(MAINTENANCE_MESSAGES.technicianSkillRequired)
    const unknown = codes.find((code) => !db.competences.find(code))
    if (unknown) throw unprocessable(MAINTENANCE_MESSAGES.technicianSkillUnknown, { code: unknown })
    return codes
  }

  registerCrudResource(router, {
    basePath: '/maintenance/technicians',
    feature: 'TECHNICIAN',
    collection: db.technicians,
    list: () => techniciansApi(db),
    searchColumns: ['no', 'fullName'],
    create: (input) => {
      const no = requireReference(db.employees, input, 'no')
      if (!isOnStaff(db.employees.findOrFail(no).status)) {
        throw unprocessable(MAINTENANCE_MESSAGES.technicianNotOnStaff)
      }
      return { no, competences: readCompetences(input), active: readBoolean(input, 'active', true) }
    },
    update: (_existing, input) => ({
      ...('competences' in input ? { competences: readCompetences(input) } : {}),
      ...('active' in input ? { active: readBoolean(input, 'active', true) } : {})
    }),
    remove: () => undefined
  })
}
