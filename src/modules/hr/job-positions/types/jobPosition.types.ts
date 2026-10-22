export interface JobPositionApi {
  no: string
  name: string
  orgUnitNo: string
  orgUnitName: string
  /** Holders drive a truck: a licence and a driving authorization are then required. */
  drives: boolean
  plannedHeadcount: number
  actualHeadcount: number
  /** Planned minus actual: positive when the position is understaffed. */
  headcountGap: number
  responsibilities: string[]
  /** Suggested category when an employee is hired on this position. */
  defaultCategoryNo: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type JobPositionSearchColumn = 'no' | 'name' | 'no,name'
