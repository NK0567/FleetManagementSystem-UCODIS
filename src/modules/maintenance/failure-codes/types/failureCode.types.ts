export const FAILURE_CODE_KINDS = ['system', 'subsystem', 'mode', 'cause'] as const
export type FailureCodeKind = (typeof FAILURE_CODE_KINDS)[number]

export interface FailureCodeApi {
  no: string
  name: string
  kind: FailureCodeKind
  parentNo: string | null
  competenceNo: string | null
  active: boolean
  parentName: string
  competenceName: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type FailureCodeSearchColumn = 'no' | 'name' | 'no,name'
