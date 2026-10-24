<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import DowntimeCodeForm from '../components/DowntimeCodeForm.vue'
import { downtimeCodeService } from '../services/downtimeCodeService'
import type { DowntimeCodeApi } from '../types/downtimeCode.types'

const emit = defineEmits<{ close: []; created: [downtimeCode: DowntimeCodeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof DowntimeCodeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: downtimeCodeService.create,
  createErrorFallback: t('maintenance.downtimeCodes.createError'),
  onCreated: (downtimeCode) => {
    emit('created', downtimeCode)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.downtimeCodes.new')"
    :banner-label="t('maintenance.downtimeCodes.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <DowntimeCodeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
