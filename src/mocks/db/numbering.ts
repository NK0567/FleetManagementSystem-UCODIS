/** Next number of a series ("LR-0007" after "LR-0006"), from the highest existing one. */
export function nextNo(existing: readonly string[], prefix: string, width: number): string {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`)
  const highest = existing.reduce((max, no) => {
    const match = pattern.exec(no)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `${prefix}${String(highest + 1).padStart(width, '0')}`
}
