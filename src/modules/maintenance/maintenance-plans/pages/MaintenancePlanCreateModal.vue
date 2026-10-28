<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import MaintenancePlanForm from '../components/MaintenancePlanForm.vue'
import { maintenancePlanService } from '../services/maintenancePlanService'
import type { MaintenancePlanApi } from '../types/maintenancePlan.types'

const emit = defineEmits<{ close: []; created: [maintenancePlan: MaintenancePlanApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof MaintenancePlanForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: maintenancePlanService.create,
  createErrorFallback: t('maintenance.maintenancePlans.createError'),
  onCreated: (maintenancePlan) => {
    emit('created', maintenancePlan)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.maintenancePlans.new')"
    :banner-label="t('maintenance.maintenancePlans.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <MaintenancePlanForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
