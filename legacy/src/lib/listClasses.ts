/**
 * Classes Tailwind partagées par les écrans de liste.
 * Centralisées ici pour que tous les écrans parlent le même langage visuel.
 */
export const pageWrap = 'px-7 py-6 max-[640px]:px-4'
export const pageHeader = 'flex items-start justify-between gap-3 mb-4 flex-wrap'
export const pageTitle = 'text-lg font-semibold text-foreground'
export const pageSub = 'text-[13px] text-muted-foreground mt-0.5'

export const btnPrimary =
  'px-4 py-[7px] rounded-md text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 bg-primary text-primary-foreground transition-colors hover:bg-primary/90'
export const btnOutline =
  'px-4 py-[7px] rounded-md text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 bg-card text-foreground border border-border transition-colors hover:bg-background'

export const tableCard = 'bg-card border border-border rounded-lg overflow-hidden'
export const toolbar = 'flex items-center justify-between px-3.5 py-2 border-b border-border gap-2 flex-wrap'
export const searchBox = 'flex items-center gap-1.5 border border-border rounded-md px-2 h-[30px] bg-card'
export const searchInput =
  'border-0 outline-none text-xs text-foreground bg-transparent w-44 placeholder:text-muted-foreground'
export const selectSm =
  'h-[30px] px-2 border border-border rounded-md text-xs text-foreground bg-card outline-none cursor-pointer focus:border-primary'

export const table = 'w-full border-collapse text-[13px]'
export const th =
  'px-3 py-2.5 text-left text-xs font-semibold text-foreground bg-background border-b border-border whitespace-nowrap'
export const td = 'px-3 py-2.5 border-b border-border text-foreground align-middle'
export const rowClickable = 'cursor-pointer transition-colors hover:bg-primary/5'

export const card = 'bg-card border border-border rounded-lg p-4'
export const cardTitle = 'flex items-center gap-1.5 text-sm font-semibold text-foreground mb-3'
export const emptyState = 'flex flex-col items-center gap-2 p-10 text-muted-foreground text-[13px]'

export const kpiCard = 'bg-card border border-border rounded-lg p-3.5 relative'
export const kpiIcon = 'w-9 h-9 rounded-lg flex items-center justify-center mb-2.5'
export const kpiLabel = 'text-[11px] text-muted-foreground uppercase tracking-[0.05em] font-semibold'
export const kpiValue = 'text-2xl font-bold text-foreground mt-1 leading-none'
export const kpiSub = 'text-[11px] text-muted-foreground mt-1.5'

/* Barre d'outils · boutons icône */
export const tbIconBtn =
  'w-[30px] h-[30px] rounded-md border border-border bg-card text-muted-foreground flex items-center justify-center cursor-pointer transition-colors relative hover:bg-background hover:text-foreground'
export const tbIconBtnActive = '!bg-primary/10 !text-primary !border-primary/20'

/* Panneau de filtres latéral */
export const filterPanel =
  'w-[220px] min-w-[220px] border-r border-border p-3.5 flex flex-col gap-2.5 bg-card overflow-y-auto'
export const fpField = 'flex flex-col gap-1'
export const fpFieldLabel = 'text-[11px] text-muted-foreground'
export const fpSelect =
  'h-[30px] px-2 border border-border rounded-md text-xs text-foreground bg-card outline-none w-full focus:border-primary'

/* Pagination */
export const pagination =
  'flex items-center gap-3 px-3.5 py-2.5 border-t border-border text-xs text-muted-foreground'
export const pagBtn =
  'min-w-[28px] h-7 px-1.5 rounded text-xs font-medium cursor-pointer border border-border bg-card text-foreground flex items-center justify-center transition-colors hover:bg-background disabled:opacity-35 disabled:cursor-not-allowed'
export const pagBtnActive = '!bg-primary !text-primary-foreground !border-primary'
export const pagSizeSelect =
  'h-[26px] px-1.5 border border-border rounded text-xs text-foreground bg-card outline-none cursor-pointer focus:border-primary'

/* Bandeau d'indicateurs au-dessus d'une liste */
export const kpiItem = 'bg-card border border-border rounded-lg px-3.5 py-3 flex items-center gap-3'
export const kpiItemIcon = 'w-9 h-9 rounded-lg flex items-center justify-center shrink-0'
export const kpiItemVal = 'text-[22px] font-bold leading-none'
export const kpiItemLbl = 'text-xs text-muted-foreground mt-0.5'
