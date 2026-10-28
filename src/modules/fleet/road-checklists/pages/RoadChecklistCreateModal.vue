<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import RoadChecklistForm from '../components/RoadChecklistForm.vue'
import { roadChecklistService } from '../services/roadChecklistService'
import type { RoadChecklistApi } from '../types/roadChecklist.types'

const emit = defineEmits<{ close: []; created: [roadChecklist: RoadChecklistApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof RoadChecklistForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: roadChecklistService.create,
  createErrorFallback: t('fleet.roadChecklists.createError'),
  onCreated: (roadChecklist) => {
    emit('created', roadChecklist)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.roadChecklists.new')"
    :banner-label="t('fleet.roadChecklists.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <RoadChecklistForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
