export const DEFAULT_COLUMN_MIN_WIDTH_PX = 80

/** Column minimum width in pixels from a CSS size such as "120px" or "8rem". */
export function parseMinWidthPx(minW?: string): number {
  const match = /^(-?\d+(?:\.\d+)?)(px|rem|em)$/i.exec(minW?.trim() ?? '')
  if (!match) return DEFAULT_COLUMN_MIN_WIDTH_PX
  const value = Number.parseFloat(match[1] ?? '')
  return (match[2] ?? '').toLowerCase() === 'px' ? value : value * 16
}
