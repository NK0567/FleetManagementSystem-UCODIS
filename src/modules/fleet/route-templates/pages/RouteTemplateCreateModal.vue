<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import RouteTemplateForm from '../components/RouteTemplateForm.vue'
import { routeTemplateService } from '../services/routeTemplateService'
import type { RouteTemplateApi } from '../types/routeTemplate.types'

const emit = defineEmits<{ close: []; created: [routeTemplate: RouteTemplateApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof RouteTemplateForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: routeTemplateService.create,
  createErrorFallback: t('fleet.routeTemplates.createError'),
  onCreated: (routeTemplate) => {
    emit('created', routeTemplate)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.routeTemplates.new')"
    :banner-label="t('fleet.routeTemplates.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <RouteTemplateForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
