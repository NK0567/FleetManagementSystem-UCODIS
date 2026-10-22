import { useI18n } from 'vue-i18n'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import { useReferenceStore } from '@/stores/referenceStore'
import { EMPTY_CELL, formatDate, formatDateTime, formatNumber } from '@/utils/format'

type Formatter = NonNullable<TableColumn['formatter']>

const isBlank = (value: unknown): boolean => value == null || value === ''

const toNumber = (value: unknown): number | null => {
  const number = Number(value)
  return isBlank(value) || Number.isNaN(number) ? null : number
}

export const formatIntegerCell: Formatter = (value) => formatNumber(toNumber(value), 0)

export const formatDecimalCell: Formatter = (value) => formatNumber(toNumber(value), 1)

export const formatDateCell: Formatter = (value) =>
  typeof value === 'string' ? formatDate(value) : EMPTY_CELL

export const formatDateTimeCell: Formatter = (value) =>
  typeof value === 'string' ? formatDateTime(value) : EMPTY_CELL

/** Formatters needing a store or i18n: call inside the setup of a list page. */
export function useListCellFormatters() {
  const { t } = useI18n()
  const optionsStore = useOptionsStore()
  const referenceStore = useReferenceStore()

  const optionLabel =
    (optionsKey: string): Formatter =>
    (value) =>
      isBlank(value) ? EMPTY_CELL : optionsStore.getOptionLabel(optionsKey, value)

  const referenceLabel =
    (referenceKey: string): Formatter =>
    (value) =>
      typeof value === 'string' && value ? referenceStore.getLabel(referenceKey, value) : EMPTY_CELL

  const booleanLabel: Formatter = (value) => {
    if (isBlank(value)) return EMPTY_CELL
    return value === true ? t('common.yes') : t('common.no')
  }

  return {
    optionLabel,
    referenceLabel,
    booleanLabel,
    formatInteger: formatIntegerCell,
    formatDecimal: formatDecimalCell,
    formatDate: formatDateCell,
    formatDateTime: formatDateTimeCell
  }
}
