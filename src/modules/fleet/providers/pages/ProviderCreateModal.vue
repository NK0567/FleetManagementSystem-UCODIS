<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import ProviderForm from '../components/ProviderForm.vue'
import { providerService } from '../services/providerService'
import type { ProviderApi } from '../types/provider.types'

const emit = defineEmits<{ close: []; created: [provider: ProviderApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof ProviderForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: providerService.create,
  createErrorFallback: t('fleet.providers.createError'),
  onCreated: (provider) => {
    emit('created', provider)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.providers.new')"
    :banner-label="t('fleet.providers.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <ProviderForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
