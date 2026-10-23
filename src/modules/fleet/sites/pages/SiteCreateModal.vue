<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import SiteForm from '../components/SiteForm.vue'
import { siteService } from '../services/siteService'
import type { SiteApi } from '../types/site.types'

const emit = defineEmits<{ close: []; created: [site: SiteApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof SiteForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: siteService.create,
  createErrorFallback: t('fleet.sites.createError'),
  onCreated: (site) => {
    emit('created', site)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.sites.new')"
    :banner-label="t('fleet.sites.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <SiteForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
