export const field = 'flex flex-col gap-1'
export const fieldLabel = 'text-xs font-medium text-foreground'
export const fieldInput =
  'h-[38px] px-2.5 border border-border rounded-md bg-background text-[13px] text-foreground outline-none w-full transition-colors focus:border-primary focus:bg-card'
export const fieldSelect = fieldInput + ' cursor-pointer'
export const fieldTextarea =
  'px-2.5 py-2 border border-border rounded-md bg-background text-[13px] text-foreground outline-none resize-y w-full transition-colors focus:border-primary focus:bg-card'
export const fieldRow = 'grid grid-cols-2 gap-3 max-sm:grid-cols-1'
export const fieldHint = 'text-[11px] text-muted-foreground'

/* Boutons de pied de modale */
export const btn =
  'px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors whitespace-nowrap'
export const btnPrimary = btn + ' bg-primary text-primary-foreground hover:bg-primary/90'
export const btnOutline = btn + ' bg-card text-foreground border border-border hover:bg-background'
export const btnDestructive = btn + ' bg-destructive text-destructive-foreground hover:bg-destructive/90'
