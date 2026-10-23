<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import InfractionTypeForm from '../components/InfractionTypeForm.vue'
import { infractionTypeService } from '../services/infractionTypeService'
import type { InfractionTypeApi } from '../types/infractionType.types'

const emit = defineEmits<{ close: []; created: [infractionType: InfractionTypeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof InfractionTypeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: infractionTypeService.create,
  createErrorFallback: t('fleet.infractionTypes.createError'),
  onCreated: (infractionType) => {
    emit('created', infractionType)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.infractionTypes.new')"
    :banner-label="t('fleet.infractionTypes.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <InfractionTypeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
