<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import TyreLayoutForm from '../components/TyreLayoutForm.vue'
import { tyreLayoutService } from '../services/tyreLayoutService'
import type { TyreLayoutApi } from '../types/tyreLayout.types'

const emit = defineEmits<{ close: []; created: [tyreLayout: TyreLayoutApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof TyreLayoutForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: tyreLayoutService.create,
  createErrorFallback: t('maintenance.tyreLayouts.createError'),
  onCreated: (tyreLayout) => {
    emit('created', tyreLayout)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.tyreLayouts.new')"
    :banner-label="t('maintenance.tyreLayouts.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <TyreLayoutForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
