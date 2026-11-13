<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import TripDebriefForm from '../components/TripDebriefForm.vue'
import { tripDebriefService } from '../services/tripDebriefService'
import type { TripDebriefApi } from '../types/tripDebrief.types'

const emit = defineEmits<{ close: []; created: [item: TripDebriefApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof TripDebriefForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: tripDebriefService.create,
  createErrorFallback: t('fleet.tripDebriefs.createError'),
  onCreated: (item) => {
    emit('created', item)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.tripDebriefs.new')"
    :banner-label="t('fleet.tripDebriefs.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <TripDebriefForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
