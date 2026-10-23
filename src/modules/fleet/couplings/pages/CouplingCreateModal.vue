<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import CouplingForm from '../components/CouplingForm.vue'
import { couplingService } from '../services/couplingService'
import type { CouplingApi } from '../types/coupling.types'

const emit = defineEmits<{ close: []; created: [coupling: CouplingApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof CouplingForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: couplingService.create,
  createErrorFallback: t('fleet.couplings.createError'),
  onCreated: (coupling) => {
    emit('created', coupling)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.couplings.new')"
    :banner-label="t('fleet.couplings.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <CouplingForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
