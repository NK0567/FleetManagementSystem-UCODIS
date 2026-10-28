<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import TyreForm from '../components/TyreForm.vue'
import { tyreService } from '../services/tyreService'
import type { TyreApi } from '../types/tyre.types'

const emit = defineEmits<{ close: []; created: [tyre: TyreApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof TyreForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: tyreService.create,
  createErrorFallback: t('maintenance.tyres.createError'),
  onCreated: (tyre) => {
    emit('created', tyre)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.tyres.new')"
    :banner-label="t('maintenance.tyres.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <TyreForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
