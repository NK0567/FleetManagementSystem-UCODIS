<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import CompanyDocumentForm from '../components/CompanyDocumentForm.vue'
import { companyDocumentService } from '../services/companyDocumentService'
import type { CompanyDocumentApi } from '../types/companyDocument.types'

const props = defineProps<{ initialData?: Partial<CompanyDocumentApi> }>()
const emit = defineEmits<{ close: []; created: [companyDocument: CompanyDocumentApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof CompanyDocumentForm> | null>(null)
const title = computed(() =>
  props.initialData?.supersedesNo
    ? t('fleet.companyDocuments.newVersion')
    : t('fleet.companyDocuments.new')
)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: companyDocumentService.create,
  createErrorFallback: t('fleet.companyDocuments.createError'),
  onCreated: (companyDocument) => {
    emit('created', companyDocument)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="title"
    :banner-label="title"
    :create-label="t('fleet.companyDocuments.action.submit')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <CompanyDocumentForm
        ref="formRef"
        is-new
        :initial-data="props.initialData ?? {}"
        :validation-errors="validationErrors"
      />
    </template>
  </CreateModalShell>
</template>
