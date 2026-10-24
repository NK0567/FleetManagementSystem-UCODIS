<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import TelematicsEventTypeForm from '../components/TelematicsEventTypeForm.vue'
import { telematicsEventTypeService } from '../services/telematicsEventTypeService'
import type { TelematicsEventTypeApi } from '../types/telematicsEventType.types'

const emit = defineEmits<{ close: []; created: [telematicsEventType: TelematicsEventTypeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof TelematicsEventTypeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: telematicsEventTypeService.create,
  createErrorFallback: t('fleet.telematicsEventTypes.createError'),
  onCreated: (telematicsEventType) => {
    emit('created', telematicsEventType)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.telematicsEventTypes.new')"
    :banner-label="t('fleet.telematicsEventTypes.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <TelematicsEventTypeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
