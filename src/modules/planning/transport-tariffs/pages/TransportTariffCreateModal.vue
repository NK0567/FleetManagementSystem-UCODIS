<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import TransportTariffForm from '../components/TransportTariffForm.vue'
import { transportTariffService } from '../services/transportTariffService'
import type { TransportTariffApi } from '../types/transportTariff.types'

const emit = defineEmits<{ close: []; created: [transportTariff: TransportTariffApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof TransportTariffForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: transportTariffService.create,
  createErrorFallback: t('planning.transportTariffs.createError'),
  onCreated: (transportTariff) => {
    emit('created', transportTariff)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('planning.transportTariffs.new')"
    :banner-label="t('planning.transportTariffs.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <TransportTariffForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
