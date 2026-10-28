<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import CompetenceForm from '../components/CompetenceForm.vue'
import { competenceService } from '../services/competenceService'
import type { CompetenceApi } from '../types/competence.types'

const emit = defineEmits<{ close: []; created: [competence: CompetenceApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof CompetenceForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: competenceService.create,
  createErrorFallback: t('maintenance.competences.createError'),
  onCreated: (competence) => {
    emit('created', competence)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('maintenance.competences.new')"
    :banner-label="t('maintenance.competences.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <CompetenceForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
