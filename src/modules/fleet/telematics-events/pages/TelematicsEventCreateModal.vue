<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import TelematicsEventForm from '../components/TelematicsEventForm.vue'
import { telematicsEventService } from '../services/telematicsEventService'
import type { TelematicsEventApi } from '../types/telematicsEvent.types'

const emit = defineEmits<{ close: []; created: [telematicsEvent: TelematicsEventApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof TelematicsEventForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: telematicsEventService.create,
  createErrorFallback: t('fleet.telematicsEvents.createError'),
  onCreated: (telematicsEvent) => {
    emit('created', telematicsEvent)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.telematicsEvents.new')"
    :banner-label="t('fleet.telematicsEvents.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <TelematicsEventForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
