<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import RouteDeviationForm from '../components/RouteDeviationForm.vue'
import { routeDeviationService } from '../services/routeDeviationService'
import type { RouteDeviationApi } from '../types/routeDeviation.types'

const emit = defineEmits<{ close: []; created: [routeDeviation: RouteDeviationApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof RouteDeviationForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: routeDeviationService.create,
  createErrorFallback: t('fleet.routeDeviations.createError'),
  onCreated: (routeDeviation) => {
    emit('created', routeDeviation)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.routeDeviations.new')"
    :banner-label="t('fleet.routeDeviations.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <RouteDeviationForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
