<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import AlertRuleForm from '../components/AlertRuleForm.vue'
import { alertRuleService } from '../services/alertRuleService'
import type { AlertRuleApi } from '../types/alertRule.types'

const emit = defineEmits<{ close: []; created: [alertRule: AlertRuleApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof AlertRuleForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: alertRuleService.create,
  createErrorFallback: t('fleet.alertRules.createError'),
  onCreated: (alertRule) => {
    emit('created', alertRule)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.alertRules.new')"
    :banner-label="t('fleet.alertRules.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <AlertRuleForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
