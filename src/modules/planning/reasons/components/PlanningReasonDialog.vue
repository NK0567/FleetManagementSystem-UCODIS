<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { reasonListKey } from '../domain/reasonLists'
import type { PlanningReasonKind } from '../types/planningReason.types'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    kind: PlanningReasonKind
    loading?: boolean
    destructive?: boolean
  }>(),
  { loading: false, destructive: false }
)
const emit = defineEmits<{ confirm: [choice: { reasonNo: string; comment: string }]; cancel: [] }>()

const { t } = useI18n()
const reasonNo = ref('')
const comment = ref('')
const referenceKey = computed(() => reasonListKey(props.kind))

watch(
  () => props.open,
  (open) => {
    if (!open) return
    reasonNo.value = ''
    comment.value = ''
  }
)
</script>

<template>
  <ConfirmDialog
    :open="open"
    :title="title"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="!reasonNo"
    :loading="loading"
    :destructive="destructive"
    panel-class="max-w-md"
    @confirm="emit('confirm', { reasonNo, comment: comment.trim() })"
    @cancel="emit('cancel')"
  >
    <div class="space-y-3">
      <BaseFormField :label="t('planning.reasons.dialog.reason')" required>
        <ReferenceLookup
          v-model="reasonNo"
          :reference-key="referenceKey"
          :modal-title="t('planning.reasons.dialog.reason')"
        />
      </BaseFormField>
      <BaseFormField :label="t('planning.reasons.dialog.comment')">
        <FormTextarea v-model="comment" :rows="3" :maxlength="500" />
      </BaseFormField>
    </div>
  </ConfirmDialog>
</template>
