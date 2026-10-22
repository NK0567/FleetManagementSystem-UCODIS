export type AnchoredDropdownPlacement = 'below' | 'above'

export type AnchoredDropdownPosition = {
  top?: number
  bottom?: number
  left: number
  width: number
  maxHeight: number
  placement: AnchoredDropdownPlacement
}

export type ComputeAnchoredDropdownPositionOptions = {
  triggerRect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>
  estimatedHeight: number
  minWidth?: number
  gap?: number
  viewportPadding?: number
  minSpace?: number
  viewportWidth?: number
  viewportHeight?: number
}

/**
 * Position a fixed dropdown under or above its trigger ,
 * based on remaining viewport space.
 */
export function computeAnchoredDropdownPosition(
  options: ComputeAnchoredDropdownPositionOptions
): AnchoredDropdownPosition {
  const gap = options.gap ?? 4
  const pad = options.viewportPadding ?? 8
  const minSpace = options.minSpace ?? 120
  const minWidth = options.minWidth ?? 280
  const vw = options.viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1024)
  const vh = options.viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 768)
  const { triggerRect, estimatedHeight } = options

  const width = Math.max(minWidth, triggerRect.width)
  const left = Math.max(pad, Math.min(triggerRect.left, vw - width - pad))

  const spaceBelow = vh - triggerRect.bottom - gap - pad
  const spaceAbove = triggerRect.top - gap - pad

  const openBelow = spaceBelow >= Math.min(estimatedHeight, minSpace) || spaceBelow >= spaceAbove

  if (openBelow) {
    const maxHeight = Math.max(80, Math.min(estimatedHeight, Math.max(0, spaceBelow)))
    return {
      top: triggerRect.bottom + gap,
      left,
      width,
      maxHeight,
      placement: 'below'
    }
  }

  const maxHeight = Math.max(80, Math.min(estimatedHeight, Math.max(0, spaceAbove)))
  return {
    bottom: vh - triggerRect.top + gap,
    left,
    width,
    maxHeight,
    placement: 'above'
  }
}

export function anchoredDropdownStyle(position: AnchoredDropdownPosition): Record<string, string> {
  const style: Record<string, string> = {
    left: `${position.left}px`,
    width: `${position.width}px`,
    maxHeight: `${position.maxHeight}px`
  }
  if (position.placement === 'above') {
    style.top = 'auto'
    style.bottom = `${position.bottom ?? 0}px`
  } else {
    style.top = `${position.top ?? 0}px`
    style.bottom = 'auto'
  }
  return style
}
