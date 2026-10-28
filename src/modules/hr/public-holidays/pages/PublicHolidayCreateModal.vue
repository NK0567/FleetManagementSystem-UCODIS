<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import PublicHolidayForm from '../components/PublicHolidayForm.vue'
import { publicHolidayService } from '../services/publicHolidayService'
import type { PublicHolidayApi } from '../types/publicHoliday.types'

const emit = defineEmits<{ close: []; created: [holiday: PublicHolidayApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof PublicHolidayForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: publicHolidayService.create,
  createErrorFallback: t('hr.publicHolidays.createError'),
  onCreated: (holiday) => {
    emit('created', holiday)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('hr.publicHolidays.new')"
    :banner-label="t('hr.publicHolidays.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <PublicHolidayForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
