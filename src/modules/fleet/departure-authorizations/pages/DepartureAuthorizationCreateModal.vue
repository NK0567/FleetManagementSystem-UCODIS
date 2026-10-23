<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import DepartureAuthorizationForm from '../components/DepartureAuthorizationForm.vue'
import { departureAuthorizationService } from '../services/departureAuthorizationService'
import type { DepartureAuthorizationApi } from '../types/departureAuthorization.types'

const emit = defineEmits<{
  close: []
  created: [departureAuthorization: DepartureAuthorizationApi]
}>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof DepartureAuthorizationForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: departureAuthorizationService.create,
  createErrorFallback: t('fleet.departureAuthorizations.createError'),
  onCreated: (departureAuthorization) => {
    emit('created', departureAuthorization)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.departureAuthorizations.new')"
    :banner-label="t('fleet.departureAuthorizations.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <DepartureAuthorizationForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
