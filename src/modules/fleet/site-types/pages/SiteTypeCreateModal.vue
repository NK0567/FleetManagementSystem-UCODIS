<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import SiteTypeForm from '../components/SiteTypeForm.vue'
import { siteTypeService } from '../services/siteTypeService'
import type { SiteTypeApi } from '../types/siteType.types'

const emit = defineEmits<{ close: []; created: [siteType: SiteTypeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof SiteTypeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: siteTypeService.create,
  createErrorFallback: t('fleet.siteTypes.createError'),
  onCreated: (siteType) => {
    emit('created', siteType)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.siteTypes.new')"
    :banner-label="t('fleet.siteTypes.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <SiteTypeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
