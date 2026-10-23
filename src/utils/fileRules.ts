/** Types a user may attach: documents and photos, nothing that a browser could run. */
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp'
] as const

export const IMAGE_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export const MAX_FILE_BYTES = 2 * 1024 * 1024

export type FileIssue = 'type' | 'size' | 'empty'

export function fileIssue(
  file: { type: string; size: number },
  allowed: readonly string[] = ALLOWED_FILE_TYPES
): FileIssue | null {
  if (file.size === 0) return 'empty'
  if (!allowed.includes(file.type)) return 'type'
  return file.size > MAX_FILE_BYTES ? 'size' : null
}
