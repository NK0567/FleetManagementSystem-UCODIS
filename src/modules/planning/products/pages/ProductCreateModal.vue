<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import ProductForm from '../components/ProductForm.vue'
import { productService } from '../services/productService'
import type { ProductApi } from '../types/product.types'

const emit = defineEmits<{ close: []; created: [product: ProductApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof ProductForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: productService.create,
  createErrorFallback: t('planning.products.createError'),
  onCreated: (product) => {
    emit('created', product)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('planning.products.new')"
    :banner-label="t('planning.products.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <ProductForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
