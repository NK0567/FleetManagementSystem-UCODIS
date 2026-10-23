<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityCreate } from '@/composables/useEntityCreate'
import EquipmentTypeForm from '../components/EquipmentTypeForm.vue'
import { equipmentTypeService } from '../services/equipmentTypeService'
import type { EquipmentTypeApi } from '../types/equipmentType.types'

const emit = defineEmits<{ close: []; created: [equipmentType: EquipmentTypeApi] }>()

const { t } = useI18n()
const formRef = ref<InstanceType<typeof EquipmentTypeForm> | null>(null)

const { isSaving, saveError, validationErrors, createItem } = useEntityCreate({
  form: formRef,
  create: equipmentTypeService.create,
  createErrorFallback: t('fleet.equipmentTypes.createError'),
  onCreated: (equipmentType) => {
    emit('created', equipmentType)
    emit('close')
  }
})
</script>

<template>
  <CreateModalShell
    :title="t('fleet.equipmentTypes.new')"
    :banner-label="t('fleet.equipmentTypes.new')"
    :create-label="t('common.save')"
    :is-saving="isSaving"
    :save-error="saveError"
    @close="emit('close')"
    @create="createItem"
  >
    <template #form>
      <EquipmentTypeForm ref="formRef" is-new :validation-errors="validationErrors" />
    </template>
  </CreateModalShell>
</template>
