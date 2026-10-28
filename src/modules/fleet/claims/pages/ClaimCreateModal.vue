<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import ClaimForm from '../components/ClaimForm.vue'
import { claimService } from '../services/claimService'
import type { ClaimApi } from '../types/claim.types'

const emit = defineEmits<{ close: []; created: [claim: ClaimApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof ClaimForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: claimService.create,
  createErrorFallback: t('fleet.claims.createError'),
  onCreated: (claim) => {
    emit('created', claim)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.claims.new')"
    :banner-label="t('fleet.claims.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <ClaimForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
