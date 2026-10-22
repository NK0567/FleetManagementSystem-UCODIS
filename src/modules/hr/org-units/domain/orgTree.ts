export interface OrgUnitNode<T extends { no: string; parentNo: string | null }> {
  unit: T
  children: OrgUnitNode<T>[]
}

/** Units whose parent is missing are treated as roots, so no unit disappears from the tree. */
export function buildOrgTree<T extends { no: string; parentNo: string | null }>(
  units: readonly T[]
): OrgUnitNode<T>[] {
  const nodes = new Map(units.map((unit) => [unit.no, { unit, children: [] as OrgUnitNode<T>[] }]))
  const roots: OrgUnitNode<T>[] = []
  for (const node of nodes.values()) {
    const parent = node.unit.parentNo ? nodes.get(node.unit.parentNo) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

export function descendantNos(
  units: readonly { no: string; parentNo: string | null }[],
  no: string
): string[] {
  const children = units.filter((unit) => unit.parentNo === no)
  return children.flatMap((child) => [child.no, ...descendantNos(units, child.no)])
}

/** Attaching a unit under itself or one of its descendants would loop the tree. */
export function wouldCreateCycle(
  units: readonly { no: string; parentNo: string | null }[],
  no: string,
  newParentNo: string | null
): boolean {
  if (!newParentNo) return false
  return newParentNo === no || descendantNos(units, no).includes(newParentNo)
}
