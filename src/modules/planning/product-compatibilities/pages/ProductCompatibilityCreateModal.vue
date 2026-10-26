<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import ProductCompatibilityForm from '../components/ProductCompatibilityForm.vue'
import { productCompatibilityService } from '../services/productCompatibilityService'
import type { ProductCompatibilityApi } from '../types/productCompatibility.types'

const emit = defineEmits<{ close: []; created: [productCompatibility: ProductCompatibilityApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof ProductCompatibilityForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: productCompatibilityService.create,
  createErrorFallback: t('planning.productCompatibilities.createError'),
  onCreated: (productCompatibility) => {
    emit('created', productCompatibility)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('planning.productCompatibilities.new')"
    :banner-label="t('planning.productCompatibilities.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <ProductCompatibilityForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
