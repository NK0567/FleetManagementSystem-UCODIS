<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import TechnicianForm from '../components/TechnicianForm.vue'
import { technicianService } from '../services/technicianService'
import type { TechnicianApi } from '../types/technician.types'

const emit = defineEmits<{ close: []; created: [technician: TechnicianApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof TechnicianForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: technicianService.create,
  createErrorFallback: t('maintenance.technicians.createError'),
  onCreated: (technician) => {
    emit('created', technician)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.technicians.new')"
    :banner-label="t('maintenance.technicians.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <TechnicianForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
