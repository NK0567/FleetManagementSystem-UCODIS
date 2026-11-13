<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import DriverReportForm from '../components/DriverReportForm.vue'
import { driverReportService } from '../services/driverReportService'
import type { DriverReportApi } from '../types/driverReport.types'

const emit = defineEmits<{ close: []; created: [item: DriverReportApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof DriverReportForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: driverReportService.create,
  createErrorFallback: t('fleet.driverReports.createError'),
  onCreated: (item) => {
    emit('created', item)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.driverReports.new')"
    :banner-label="t('fleet.driverReports.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <DriverReportForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
