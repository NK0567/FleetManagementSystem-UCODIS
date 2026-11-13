export const MEDICAL_KINDS = [
  'visit',
  'alcohol_test',
  'drug_test',
  'psychotechnic',
  'complementary_exam',
  'vaccination'
] as const
export type MedicalFollowUpKind = (typeof MEDICAL_KINDS)[number]

export const MEDICAL_RESULTS = [
  'fit',
  'fit_restrictions',
  'unfit_temporary',
  'unfit_permanent',
  'negative',
  'positive',
  'pending'
] as const
export type MedicalFollowUpResult = (typeof MEDICAL_RESULTS)[number]

export const MEDICAL_STATUSES = ['compliant', 'non_compliant', 'pending'] as const
export type MedicalFollowUpStatus = (typeof MEDICAL_STATUSES)[number]

const SUBSTANCE_TESTS: MedicalFollowUpKind[] = ['alcohol_test', 'drug_test']
const SUBSTANCE_RESULTS: MedicalFollowUpResult[] = ['negative', 'positive', 'pending']
const APTITUDE_RESULTS: MedicalFollowUpResult[] = [
  'fit',
  'fit_restrictions',
  'unfit_temporary',
  'unfit_permanent',
  'pending'
]

/** A screening gives negative or positive; the other follow-ups give an aptitude. */
export function isResultAllowed(kind: MedicalFollowUpKind, result: MedicalFollowUpResult): boolean {
  return (SUBSTANCE_TESTS.includes(kind) ? SUBSTANCE_RESULTS : APTITUDE_RESULTS).includes(result)
}

/** A positive screening or an unfit driver needs a follow-up to be written down. */
export function needsFollowUp(result: MedicalFollowUpResult): boolean {
  return result === 'positive' || result === 'unfit_temporary' || result === 'unfit_permanent'
}

export function medicalStatus(facts: {
  result: MedicalFollowUpResult
  nextDueOn: string | null
  today: string
}): MedicalFollowUpStatus {
  if (facts.result === 'pending') return 'pending'
  if (needsFollowUp(facts.result)) return 'non_compliant'
  if (facts.nextDueOn && facts.nextDueOn < facts.today) return 'non_compliant'
  return 'compliant'
}
