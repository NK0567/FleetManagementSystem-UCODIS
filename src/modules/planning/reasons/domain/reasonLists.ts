import type { PlanningReasonKind } from '../types/planningReason.types'

/** Reference list holding the active reasons of one kind, such as `cancellationReasons`. */
export function reasonListKey(kind: PlanningReasonKind): string {
  const camel = kind.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
  return `${camel}Reasons`
}
