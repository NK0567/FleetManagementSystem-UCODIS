/** One line of the activity log: who did what, on which record, and when. */
export interface ActivityLogEntryApi {
  no: string
  at: string
  by: string
  byName: string
  action: string
  actionLabel: string
  entity: string
  entityLabel: string
  recordNo: string
  detail: string
}

export type ActivityLogSearchColumn =
  | 'byName'
  | 'actionLabel'
  | 'entityLabel'
  | 'recordNo'
  | 'byName,by,actionLabel,entityLabel,recordNo,detail'
