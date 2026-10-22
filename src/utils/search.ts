/** Case and accent insensitive form of a text, for comparisons typed by users. */
export function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}
