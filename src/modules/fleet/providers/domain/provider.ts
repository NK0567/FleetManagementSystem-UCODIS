import type { ProviderContract } from '../types/provider.types'

export type ContractIssue =
  | 'subjectRequired'
  | 'startRequired'
  | 'endBeforeStart'
  | 'negativeAmount'

export function contractIssues(contract: Omit<ProviderContract, 'reference'>): ContractIssue[] {
  const issues: ContractIssue[] = []
  if (!contract.subject.trim()) issues.push('subjectRequired')
  if (!contract.startDate) issues.push('startRequired')
  else if (contract.endDate && contract.endDate < contract.startDate) issues.push('endBeforeStart')
  if (contract.amount != null && contract.amount < 0) issues.push('negativeAmount')
  return issues
}

/** A contract with no end date runs until it is closed. */
export function isContractActive(contract: ProviderContract, today: string): boolean {
  return contract.startDate <= today && (!contract.endDate || contract.endDate >= today)
}
