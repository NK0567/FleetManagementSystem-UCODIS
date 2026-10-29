<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import ProviderTypeForm from '../components/ProviderTypeForm.vue'
import { providerTypeService } from '../services/providerTypeService'
import type { ProviderTypeApi } from '../types/providerType.types'

const emit = defineEmits<{ close: []; created: [providerType: ProviderTypeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof ProviderTypeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: providerTypeService.create,
  createErrorFallback: t('fleet.providerTypes.createError'),
  onCreated: (providerType) => {
    emit('created', providerType)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.providerTypes.new')"
    :banner-label="t('fleet.providerTypes.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <ProviderTypeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
