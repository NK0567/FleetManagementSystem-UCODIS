<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import MissionTypeForm from '../components/MissionTypeForm.vue'
import { missionTypeService } from '../services/missionTypeService'
import type { MissionTypeApi } from '../types/missionType.types'

const emit = defineEmits<{ close: []; created: [missionType: MissionTypeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof MissionTypeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: missionTypeService.create,
  createErrorFallback: t('maintenance.missionTypes.createError'),
  onCreated: (missionType) => {
    emit('created', missionType)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.missionTypes.new')"
    :banner-label="t('maintenance.missionTypes.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <MissionTypeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
