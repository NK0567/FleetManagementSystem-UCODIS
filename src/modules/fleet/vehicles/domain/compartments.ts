/**
 * What a compartment may hold, decided at the 27 October review: the product families it accepts
 * (none listed means any), whether it takes one family or one product at a time, and whether it
 * must be filled completely once used.
 */
export const COMPARTMENT_CONTENTS = ['mixed', 'one_family', 'one_product'] as const
export type CompartmentContent = (typeof COMPARTMENT_CONTENTS)[number]

export interface CompartmentRules {
  no: number
  volumeL: number
  families: string[]
  content: CompartmentContent
  fullFill: boolean
}

export interface LoadLine {
  lineNo: number
  productNo: string
  productName: string
  family: string
  /** Volume in litres; null when the order does not say. */
  volumeL: number | null
}

export interface CompartmentUse {
  no: number
  volumeL: number
  usedL: number
  lines: { lineNo: number; productName: string; volumeL: number }[]
}

export type CompartmentIssue =
  | { code: 'noRoom'; lineNo: number; productName: string }
  | { code: 'notFull'; no: number; usedL: number; volumeL: number }

export const defaultRules = (no: number, volumeL: number): CompartmentRules => ({
  no,
  volumeL,
  families: [],
  content: 'mixed',
  fullFill: false
})

/** A vehicle with no separation is one compartment of its whole capacity, open to everything. */
export function compartmentsOf(
  compartments: readonly Partial<CompartmentRules>[],
  wholeVolumeL: number | null
): CompartmentRules[] {
  if (!compartments.length) return wholeVolumeL ? [defaultRules(1, wholeVolumeL)] : []
  return compartments.map((item, index) => ({
    ...defaultRules(index + 1, item.volumeL ?? 0),
    ...item,
    no: index + 1,
    families: [...(item.families ?? [])]
  }))
}

function accepts(rules: CompartmentRules, use: CompartmentUse, line: LoadLine, held: LoadLine[]) {
  if (rules.families.length && !rules.families.includes(line.family)) return false
  if (rules.content === 'one_product')
    return held.every((item) => item.productNo === line.productNo)
  if (rules.content === 'one_family') return held.every((item) => item.family === line.family)
  return use.usedL <= use.volumeL
}

interface Placement {
  uses: CompartmentUse[]
  issues: CompartmentIssue[]
  /** Litres left on the ground, to compare two placements. */
  leftL: number
}

/**
 * One pass: the lines, largest first, fill the compartments in order; a line may spread over
 * several. `reserved` keeps some compartments for one product only.
 */
function fill(
  compartments: readonly CompartmentRules[],
  lines: readonly LoadLine[],
  reserved: ReadonlyMap<number, string>
): Placement {
  const uses: CompartmentUse[] = compartments.map((item) => ({
    no: item.no,
    volumeL: item.volumeL,
    usedL: 0,
    lines: []
  }))
  const held = new Map<number, LoadLine[]>(compartments.map((item) => [item.no, []]))
  const issues: CompartmentIssue[] = []
  let leftL = 0
  const ordered = [...lines].sort((a, b) => (b.volumeL ?? 0) - (a.volumeL ?? 0))

  for (const line of ordered) {
    let left = line.volumeL ?? 0
    let placed = false
    for (const rules of compartments) {
      const keptFor = reserved.get(rules.no)
      if (keptFor && keptFor !== line.productNo) continue
      const use = uses.find((item) => item.no === rules.no)!
      const content = held.get(rules.no)!
      if (!accepts(rules, use, line, content)) continue
      const room = rules.volumeL - use.usedL
      if (line.volumeL !== null && room <= 0) continue
      const taken = line.volumeL === null ? 0 : Math.min(room, left)
      use.usedL += taken
      use.lines.push({ lineNo: line.lineNo, productName: line.productName, volumeL: taken })
      content.push(line)
      left -= taken
      placed = true
      if (left <= 0) break
    }
    if (!placed || left > 0) {
      issues.push({ code: 'noRoom', lineNo: line.lineNo, productName: line.productName })
      leftL += placed ? left : Math.max(left, 1)
    }
  }

  for (const rules of compartments) {
    const use = uses.find((item) => item.no === rules.no)!
    if (rules.fullFill && use.usedL > 0 && use.usedL < rules.volumeL) {
      issues.push({ code: 'notFull', no: rules.no, usedL: use.usedL, volumeL: rules.volumeL })
    }
  }
  return { uses, issues, leftL }
}

const count = (placement: Placement, code: CompartmentIssue['code']) =>
  placement.issues.filter((issue) => issue.code === code).length

/** Fewer lines left out first, then fewer litres left out, then fewer compartments part full. */
function better(a: Placement, b: Placement): boolean {
  return (
    (count(a, 'noRoom') - count(b, 'noRoom') ||
      a.leftL - b.leftL ||
      count(a, 'notFull') - count(b, 'notFull')) < 0
  )
}

/** Above this many combinations the search stops at the simple pass. */
const SEARCH_LIMIT = 20000

/**
 * Places the lines in the compartments. Each compartment may be kept for one product or left
 * open, and every combination is tried (a tanker has few compartments), keeping the one that
 * leaves the least on the ground. It is a proposal for the planner, who keeps the last word:
 * whatever cannot be placed or leaves a compartment part full is returned as an issue rather
 * than refused.
 */
export function allocate(
  compartments: readonly CompartmentRules[],
  lines: readonly LoadLine[]
): { uses: CompartmentUse[]; issues: CompartmentIssue[] } {
  let best = fill(compartments, lines, new Map())
  const products = [...new Set(lines.map((line) => line.productNo))]
  const choices = products.length + 1
  if (products.length > 1 && choices ** compartments.length <= SEARCH_LIMIT) {
    const pick = new Array<number>(compartments.length).fill(0)
    for (let combination = 1; combination < choices ** compartments.length; combination++) {
      let rest = combination
      for (let index = 0; index < pick.length; index++) {
        pick[index] = rest % choices
        rest = Math.floor(rest / choices)
      }
      const reserved = new Map<number, string>()
      pick.forEach((choice, index) => {
        if (choice > 0) reserved.set(compartments[index]!.no, products[choice - 1]!)
      })
      const tried = fill(compartments, lines, reserved)
      if (better(tried, best)) best = tried
      if (!best.issues.length) break
    }
  }
  return { uses: best.uses, issues: best.issues }
}

/** A vehicle reserved to some product families refuses the others; none listed takes them all. */
export const familyAllowed = (vehicleFamilies: readonly string[], family: string) =>
  !vehicleFamilies.length || vehicleFamilies.includes(family)
