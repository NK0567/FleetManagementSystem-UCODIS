<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import DocumentTypeForm from '../components/DocumentTypeForm.vue'
import { documentTypeService } from '../services/documentTypeService'
import type { DocumentTypeApi } from '../types/documentType.types'

const emit = defineEmits<{ close: []; created: [documentType: DocumentTypeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof DocumentTypeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: documentTypeService.create,
  createErrorFallback: t('fleet.documentTypes.createError'),
  onCreated: (documentType) => {
    emit('created', documentType)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.documentTypes.new')"
    :banner-label="t('fleet.documentTypes.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <DocumentTypeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
