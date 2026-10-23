<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import DocumentForm from '../components/DocumentForm.vue'
import { documentService } from '../services/documentService'
import type { DocumentApi } from '../types/document.types'

/** Prefilled when renewing a document or filling a missing one. */
const props = defineProps<{ initialData?: Partial<DocumentApi> }>()
const emit = defineEmits<{ close: []; created: [document: DocumentApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof DocumentForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: documentService.create,
  createErrorFallback: t('fleet.documents.createError'),
  onCreated: (document) => {
    emit('created', document)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.documents.new')"
    :banner-label="t('fleet.documents.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <DocumentForm
        ref="formRef"
        is-new
        :initial-data="props.initialData ?? {}"
        :validation-errors="validationErrors"
      />
    </template>
  </CreateModalShell>
</template>
