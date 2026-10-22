import type { WorkingCalendarApi } from '@/modules/hr/working-calendar/types/workingCalendar.types'
import {
  isCompleteWeek,
  weeklyWorkingMinutes,
  workingDayIssues,
  type WorkingDay
} from '@/modules/hr/working-calendar/domain/workingDays'
import type { MockDatabase } from '../../db/database'
import { unprocessable } from '../../http/errors'
import { readBody, stampModified } from '../../http/crudResource'
import { invalidField, readBoolean, readNumber, readString } from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { WORKING_CALENDAR_NO } from '../../fixtures/hr/calendar'
import { HR_MESSAGES } from './messages'

function readDay(raw: unknown): WorkingDay {
  if (!raw || typeof raw !== 'object') throw invalidField('days')
  const input = raw as Record<string, unknown>
  return {
    dayOfWeek: readNumber(input, 'dayOfWeek', { required: true }) ?? 0,
    working: readBoolean(input, 'working'),
    start: readString(input, 'start'),
    end: readString(input, 'end'),
    hasBreak: readBoolean(input, 'hasBreak'),
    breakStart: readString(input, 'breakStart'),
    breakEnd: readString(input, 'breakEnd')
  }
}

/** The company has a single working calendar, read and replaced as a whole. */
export function registerWorkingCalendarHandlers(router: MockRouter, db: MockDatabase): void {
  const toApi = (): WorkingCalendarApi => {
    const calendar = db.workingCalendar.findOrFail(WORKING_CALENDAR_NO)
    return {
      days: [...calendar.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
      weeklyMinutes: weeklyWorkingMinutes(calendar.days),
      modifiedAt: calendar.modifiedAt,
      modifiedBy: calendar.modifiedBy
    }
  }

  router.get('/hr/working-calendar', { feature: 'WORKINGCALENDAR', action: 'read' }, () =>
    ok(toApi())
  )

  router.put(
    '/hr/working-calendar',
    { feature: 'WORKINGCALENDAR', action: 'update' },
    (request) => {
      const body = readBody(request)
      if (!Array.isArray(body.days)) throw invalidField('days')
      const days = body.days.map(readDay)
      if (!isCompleteWeek(days)) throw unprocessable(HR_MESSAGES.incompleteWorkingWeek)
      const invalid = days.find((day) => workingDayIssues(day).length > 0)
      if (invalid) throw unprocessable(HR_MESSAGES.invalidWorkingDay, { day: invalid.dayOfWeek })
      db.workingCalendar.update(WORKING_CALENDAR_NO, { days, ...stampModified(request) })
      return ok(toApi())
    }
  )
}
