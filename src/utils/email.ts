/** Deliberately loose: one @, no spaces, a dot in the domain. The mail server has the last word. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}
