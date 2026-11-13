import {
  MEDICAL_KINDS,
  MEDICAL_RESULTS,
  isResultAllowed,
  medicalStatus,
  needsFollowUp,
  type MedicalFollowUpKind,
  type MedicalFollowUpResult
} from '@/modules/fleet/medical-follow-ups/domain/medicalFollowUp'
import type { MedicalFollowUpApi } from '@/modules/fleet/medical-follow-ups/types/medicalFollowUp.types'
import { employeeFullName, isOnStaff } from '@/modules/hr/employees/domain/employee'
import { addDays, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { MedicalFollowUpRow } from '../../fixtures/fleet/medicalFollowUps'
import { registerCrudResource } from '../../http/crudResource'
import { unprocessable } from '../../http/errors'
import {
  readDate,
  readEnum,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { requireReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'

export function medicalFollowUpsApi(db: MockDatabase): MedicalFollowUpApi[] {
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  const today = todayIso()
  const soon = addDays(today, 30)
  return db.medicalFollowUps.all().map((row) => {
    const status = medicalStatus({ result: row.result, nextDueOn: row.nextDueOn, today })
    return {
      ...row,
      lostDays: row.lostDays ?? null,
      employeeName: names.get(row.employeeNo) ?? row.employeeNo,
      overdue: !!row.nextDueOn && row.nextDueOn < today,
      dueSoon: !!row.nextDueOn && row.nextDueOn >= today && row.nextDueOn <= soon,
      status
    }
  })
}

interface Facts {
  kind: MedicalFollowUpKind
  result: MedicalFollowUpResult
  doneOn: string
  nextDueOn: string | null
  followUp: string
}

function checkFacts(facts: Facts): void {
  if (facts.doneOn > todayIso()) throw unprocessable(FLEET_MESSAGES.medicalInFuture)
  if (!isResultAllowed(facts.kind, facts.result)) {
    throw unprocessable(FLEET_MESSAGES.medicalResultMismatch)
  }
  if (facts.nextDueOn && facts.nextDueOn <= facts.doneOn) {
    throw unprocessable(FLEET_MESSAGES.medicalNextBeforeDone)
  }
  if (needsFollowUp(facts.result) && !facts.followUp.trim()) {
    throw unprocessable(FLEET_MESSAGES.medicalFollowUpRequired)
  }
}

type EditableFields = Pick<
  MedicalFollowUpRow,
  'kind' | 'result' | 'doneOn' | 'provider' | 'nextDueOn' | 'lostDays' | 'followUp'
>

const readers: FieldReaders<EditableFields> = {
  kind: (input) => readEnum(input, 'kind', MEDICAL_KINDS, { required: true }) ?? 'visit',
  result: (input) => readEnum(input, 'result', MEDICAL_RESULTS, { required: true }) ?? 'pending',
  doneOn: (input) => readDate(input, 'doneOn', { required: true }) ?? '',
  provider: (input) => readString(input, 'provider'),
  nextDueOn: (input) => readDate(input, 'nextDueOn'),
  lostDays: (input) => readNumber(input, 'lostDays', { min: 0, max: 366 }),
  followUp: (input) => readString(input, 'followUp')
}

export function registerMedicalFollowUpsHandlers(router: MockRouter, db: MockDatabase): void {
  registerCrudResource(router, {
    basePath: '/fleet/medical-follow-ups',
    feature: 'MEDICALFOLLOWUP',
    collection: db.medicalFollowUps,
    list: () => medicalFollowUpsApi(db),
    searchColumns: ['no', 'employeeName', 'provider'],
    optionFields: {
      kind: 'medicalFollowUpKind',
      result: 'medicalFollowUpResult',
      status: 'medicalFollowUpStatus'
    },
    create: (input) => {
      const employeeNo = requireReference(db.employees, input, 'employeeNo')
      if (!isOnStaff(db.employees.findOrFail(employeeNo).status)) {
        throw unprocessable(FLEET_MESSAGES.notOnStaff)
      }
      const facts: Facts = {
        kind: readEnum(input, 'kind', MEDICAL_KINDS, { required: true }) ?? 'visit',
        result: readEnum(input, 'result', MEDICAL_RESULTS, { required: true }) ?? 'pending',
        doneOn: readDate(input, 'doneOn', { required: true }) ?? '',
        nextDueOn: readDate(input, 'nextDueOn'),
        followUp: readString(input, 'followUp')
      }
      checkFacts(facts)
      return {
        no: nextNo(
          db.medicalFollowUps.all().map((row) => row.no),
          'MED-',
          5
        ),
        employeeNo,
        ...facts,
        provider: readString(input, 'provider'),
        lostDays: readNumber(input, 'lostDays', { min: 0, max: 366 })
      }
    },
    update: (existing, input) => {
      const patch = readPatch(input, readers)
      checkFacts({ ...existing, ...patch })
      return patch
    }
  })
}
