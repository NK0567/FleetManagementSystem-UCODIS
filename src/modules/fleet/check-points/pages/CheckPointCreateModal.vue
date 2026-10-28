<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import CheckPointForm from '../components/CheckPointForm.vue'
import { checkPointService } from '../services/checkPointService'
import type { CheckPointApi } from '../types/checkPoint.types'

const emit = defineEmits<{ close: []; created: [checkPoint: CheckPointApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof CheckPointForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: checkPointService.create,
  createErrorFallback: t('fleet.checkPoints.createError'),
  onCreated: (checkPoint) => {
    emit('created', checkPoint)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.checkPoints.new')"
    :banner-label="t('fleet.checkPoints.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <CheckPointForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
