<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import EmployeeCategoryForm from '../components/EmployeeCategoryForm.vue'
import { employeeCategoryService } from '../services/employeeCategoryService'
import type { EmployeeCategoryApi } from '../types/employeeCategory.types'

const emit = defineEmits<{ close: []; created: [category: EmployeeCategoryApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof EmployeeCategoryForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: employeeCategoryService.create,
  createErrorFallback: t('hr.employeeCategories.createError'),
  onCreated: (category) => {
    emit('created', category)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('hr.employeeCategories.new')"
    :banner-label="t('hr.employeeCategories.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <EmployeeCategoryForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
