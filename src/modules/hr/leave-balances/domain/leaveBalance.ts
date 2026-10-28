export interface LeaveBalanceFigures {
  entitlementDays: number
  carriedOverDays: number
  adjustmentDays: number
  takenDays: number
  pendingDays: number
}

export interface ComputedLeaveBalance extends LeaveBalanceFigures {
  /** Left once approved leave is deducted. */
  remainingDays: number
  /** Left once pending requests are also deducted. */
  availableDays: number
}

export function computeLeaveBalance(figures: LeaveBalanceFigures): ComputedLeaveBalance {
  const remainingDays =
    figures.entitlementDays + figures.carriedOverDays + figures.adjustmentDays - figures.takenDays
  return { ...figures, remainingDays, availableDays: remainingDays - figures.pendingDays }
}
