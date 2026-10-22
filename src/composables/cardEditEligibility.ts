/**
 * Shared edit eligibility for entity cards (shell pencil, open mode, form editing).
 *
 * Business modules compute `isDocumentEditable` (status, approval, etc.) and pass it here.
 * Use with `applyCardInitialOpenMode` via `canOpenInEditMode`.
 */
export type CardEditEligibility = {
  canEditContent: boolean
  showEditPencil: boolean
  canOpenInEditMode: boolean
}

export function resolveCardEditEligibility(input: {
  isNew: boolean
  isDocumentEditable: boolean
}): CardEditEligibility {
  if (input.isNew) {
    return {
      canEditContent: true,
      showEditPencil: false,
      canOpenInEditMode: true
    }
  }
  const canEdit = input.isDocumentEditable
  return {
    canEditContent: canEdit,
    showEditPencil: canEdit,
    canOpenInEditMode: canEdit
  }
}

export function shouldShowCardSaveButton(input: { isNew: boolean; isDirty: boolean }): boolean {
  return input.isNew || input.isDirty
}
