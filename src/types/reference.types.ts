/** Small, rarely changing lists served by GET /reference/all for selects and filters. */
export interface ReferenceItem {
  code: string
  description: string
  /** Parent code for hierarchical references (org units). */
  parentCode?: string
  active?: boolean
}

export type ReferenceData = Record<string, ReferenceItem[]>
