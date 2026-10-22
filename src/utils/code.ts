export const CODE_MAX_LENGTH = 12

/** Business codes typed by users: letters, digits and dashes, stored in upper case. */
export function isValidCode(value: string): boolean {
  return new RegExp(`^[A-Za-z0-9-]{1,${CODE_MAX_LENGTH}}$`).test(value.trim())
}
