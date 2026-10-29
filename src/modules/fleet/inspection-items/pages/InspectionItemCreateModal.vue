<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import InspectionItemForm from '../components/InspectionItemForm.vue'
import { inspectionItemService } from '../services/inspectionItemService'
import type { InspectionItemApi } from '../types/inspectionItem.types'

const emit = defineEmits<{ close: []; created: [inspectionItem: InspectionItemApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof InspectionItemForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: inspectionItemService.create,
  createErrorFallback: t('fleet.inspectionItems.createError'),
  onCreated: (inspectionItem) => {
    emit('created', inspectionItem)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.inspectionItems.new')"
    :banner-label="t('fleet.inspectionItems.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <InspectionItemForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
