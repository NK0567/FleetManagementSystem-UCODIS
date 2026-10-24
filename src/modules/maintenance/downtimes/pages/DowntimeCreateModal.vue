<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import DowntimeForm from '../components/DowntimeForm.vue'
import { downtimeService } from '../services/downtimeService'
import type { DowntimeApi } from '../types/downtime.types'

const emit = defineEmits<{ close: []; created: [downtime: DowntimeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof DowntimeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: downtimeService.create,
  createErrorFallback: t('maintenance.downtimes.createError'),
  onCreated: (downtime) => {
    emit('created', downtime)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.downtimes.new')"
    :banner-label="t('maintenance.downtimes.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <DowntimeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
