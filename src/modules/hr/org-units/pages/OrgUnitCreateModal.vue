<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import OrgUnitForm from '../components/OrgUnitForm.vue'
import { orgUnitService } from '../services/orgUnitService'
import type { OrgUnitApi } from '../types/orgUnit.types'

const emit = defineEmits<{ close: []; created: [unit: OrgUnitApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof OrgUnitForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: orgUnitService.create,
  createErrorFallback: t('hr.orgUnits.createError'),
  onCreated: (unit) => {
    emit('created', unit)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('hr.orgUnits.new')"
    :banner-label="t('hr.orgUnits.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <OrgUnitForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
