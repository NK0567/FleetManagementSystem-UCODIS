<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import TripForm from '../components/TripForm.vue'
import { tripService } from '../services/tripService'
import type { TripApi } from '../types/trip.types'

const emit = defineEmits<{ close: []; created: [trip: TripApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof TripForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: tripService.create,
  createErrorFallback: t('fleet.trips.createError'),
  onCreated: (trip) => {
    emit('created', trip)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.trips.new')"
    :banner-label="t('fleet.trips.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <TripForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
