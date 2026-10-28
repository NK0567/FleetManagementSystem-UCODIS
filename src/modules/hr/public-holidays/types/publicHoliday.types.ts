export interface PublicHolidayApi {
  no: string
  name: string
  date: string
  /** Repeats every year on the same month and day. */
  recurring: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type PublicHolidaySearchColumn = 'name'
