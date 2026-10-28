import { ref, computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AxiosResponse } from 'axios'
import type { TableColumn } from '@/components/shared/SortableTableHeader.vue'
import type { FilterFieldDef } from '@/components/shared/AdvancedFilterPanel.vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { buildListExportColumns } from '@/utils/buildListExportColumns'
import { downloadBlobResponse, EmptyExportError } from '@/utils/downloadBlobResponse'
import { usePermissions } from '@/composables/usePermissions'

/** Server-side Excel export of the current list (search, filters, sort and visible columns). */
export function useListExcelExport(options: {
  feature: string
  fileBaseName: string
  /** Columns the user currently sees. */
  columns: MaybeRefOrGetter<TableColumn[]>
  /** Also exports the filterable fields that are not displayed. */
  filterFields?: MaybeRefOrGetter<FilterFieldDef[]>
  exportApi: (body: Record<string, unknown>) => Promise<AxiosResponse<Blob>>
  getExportBody: (columns: TableColumn[]) => Record<string, unknown>
}) {
  const { t } = useI18n()
  const { canExport } = usePermissions(options.feature)
  const exporting = ref(false)
  const exportError = ref<string | null>(null)

  const exportColumns = computed(() => {
    const columns = toValue(options.columns)
    const fields = options.filterFields ? toValue(options.filterFields) : []
    return fields.length ? buildListExportColumns(columns, fields, t) : columns
  })

  async function exportToExcel() {
    if (!canExport.value || exporting.value) return
    exporting.value = true
    exportError.value = null
    try {
      const response = await options.exportApi(options.getExportBody(exportColumns.value))
      downloadBlobResponse(response, options.fileBaseName)
    } catch (error) {
      exportError.value =
        error instanceof EmptyExportError
          ? t('common.exportExcelEmpty')
          : apiErrorMessage(error, t('common.exportExcelError'))
    } finally {
      exporting.value = false
    }
  }

  return { exportToExcel, exporting, exportError, canExport }
}
