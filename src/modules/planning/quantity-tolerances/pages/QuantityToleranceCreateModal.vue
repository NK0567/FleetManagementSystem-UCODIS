<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import QuantityToleranceForm from '../components/QuantityToleranceForm.vue'
import { quantityToleranceService } from '../services/quantityToleranceService'
import type { QuantityToleranceApi } from '../types/quantityTolerance.types'

const emit = defineEmits<{ close: []; created: [quantityTolerance: QuantityToleranceApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof QuantityToleranceForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: quantityToleranceService.create,
  createErrorFallback: t('planning.quantityTolerances.createError'),
  onCreated: (quantityTolerance) => {
    emit('created', quantityTolerance)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('planning.quantityTolerances.new')"
    :banner-label="t('planning.quantityTolerances.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <QuantityToleranceForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
