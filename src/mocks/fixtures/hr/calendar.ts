import type { WorkingDay } from '@/modules/hr/working-calendar/domain/workingDays'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface WorkingCalendarRow extends MockRow {
  days: WorkingDay[]
}

export interface PublicHolidayRow extends MockRow {
  name: string
  date: string
  recurring: boolean
}

export const WORKING_CALENDAR_NO = 'default'

function workingDay(dayOfWeek: number, working: boolean): WorkingDay {
  return {
    dayOfWeek,
    working,
    start: '07:30',
    end: '16:30',
    hasBreak: working,
    breakStart: '12:00',
    breakEnd: '13:00'
  }
}

/** Long-distance transport runs on Saturdays; Sunday is the rest day. */
export const workingCalendarCollection: CollectionDefinition<WorkingCalendarRow> = {
  name: 'hr-working-calendar',
  seed: () => [
    {
      no: WORKING_CALENDAR_NO,
      days: [1, 2, 3, 4, 5, 6, 7].map((day) => workingDay(day, day !== 7)),
      ...seedAudit
    }
  ]
}

/** Malagasy public holidays: the long-distance transport stops on these days. */
export const publicHolidaysCollection: CollectionDefinition<PublicHolidayRow> = {
  name: 'hr-public-holidays',
  seed: () =>
    [
      ['2026-01-01', "Jour de l'An", true],
      ['2026-03-08', 'Journée de la femme', true],
      ['2026-03-29', 'Fête des Martyrs', true],
      ['2026-04-06', 'Lundi de Pâques', false],
      ['2026-05-01', 'Fête du Travail', true],
      ['2026-05-14', 'Ascension', false],
      ['2026-05-25', "Journée de l'Afrique", true],
      ['2026-06-26', "Fête de l'Indépendance", true],
      ['2026-08-15', 'Assomption', true],
      ['2026-11-01', 'Toussaint', true],
      ['2026-12-25', 'Noël', true]
    ].map(([date, name, recurring], index) => ({
      no: `PH-${String(index + 1).padStart(3, '0')}`,
      date: String(date),
      name: String(name),
      recurring: Boolean(recurring),
      ...seedAudit
    }))
}
