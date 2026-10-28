<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import InfractionForm from '../components/InfractionForm.vue'
import { infractionService } from '../services/infractionService'
import type { InfractionApi } from '../types/infraction.types'

const emit = defineEmits<{ close: []; created: [infraction: InfractionApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof InfractionForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: infractionService.create,
  createErrorFallback: t('fleet.infractions.createError'),
  onCreated: (infraction) => {
    emit('created', infraction)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.infractions.new')"
    :banner-label="t('fleet.infractions.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <InfractionForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
