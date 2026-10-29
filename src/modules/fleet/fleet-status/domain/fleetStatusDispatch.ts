import { isValidEmail } from '@/utils/email'

/** One address of the recipients of the fleet status. */
export function isValidEmailAddress(value: string): boolean {
  return isValidEmail(value.trim())
}

/** Addresses typed in one field, separated by commas, semicolons or spaces; duplicates dropped. */
export function parseRecipients(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[,;\s]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  ]
}
