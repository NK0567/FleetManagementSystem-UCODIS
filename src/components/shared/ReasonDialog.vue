<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    label: string
    confirmLabel?: string
    /** 0 makes the reason optional. */
    minLength?: number
    loading?: boolean
    destructive?: boolean
  }>(),
  {
    confirmLabel: undefined,
    minLength: 0,
    loading: false,
    destructive: false
  }
)
const emit = defineEmits<{ confirm: [reason: string]; cancel: [] }>()

const { t } = useI18n()
const reason = ref('')
const touched = ref(false)

const length = computed(() => reason.value.trim().length)
const tooShort = computed(() => length.value < props.minLength)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    reason.value = ''
    touched.value = false
  }
)

function confirm() {
  touched.value = true
  if (!tooShort.value) emit('confirm', reason.value.trim())
}
</script>

<template>
  <ConfirmDialog
    :open="open"
    :title="title"
    :confirm-label="confirmLabel"
    :loading="loading"
    :destructive="destructive"
    panel-class="max-w-md"
    @confirm="confirm"
    @cancel="emit('cancel')"
  >
    <BaseFormField :label="label" :required="minLength > 0">
      <FormTextarea v-model="reason" :rows="4" :maxlength="500" :invalid="touched && tooShort" />
      <p
        v-if="minLength > 0"
        class="text-xs mt-1"
        :class="touched && tooShort ? 'text-destructive' : 'text-muted-foreground'"
      >
        {{ t('common.minLength', { count: length, min: minLength }) }}
      </p>
    </BaseFormField>
  </ConfirmDialog>
</template>
