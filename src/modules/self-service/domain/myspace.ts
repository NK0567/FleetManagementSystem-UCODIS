export const FIELD_ROLES = ['driver', 'assistant'] as const
export type FieldRole = (typeof FIELD_ROLES)[number]

/** The assistant reads the tour. Only the driver declares. */
export function mayDeclare(role: FieldRole): boolean {
  return role === 'driver'
}
