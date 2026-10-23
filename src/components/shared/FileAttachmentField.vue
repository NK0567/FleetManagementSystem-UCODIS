<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ExternalLink, Paperclip, Upload, X } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { fileApi } from '@/core/api/fileApi'
import { openStoredFile } from '@/composables/useFileObjectUrls'
import type { FileMeta } from '@/types/file.types'
import { ALLOWED_FILE_TYPES, MAX_FILE_BYTES, fileIssue } from '@/utils/fileRules'
import { formatNumber } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    file: FileMeta | null
    disabled?: boolean
    invalid?: boolean
    accept?: readonly string[]
  }>(),
  { disabled: false, invalid: false, accept: () => ALLOWED_FILE_TYPES }
)
const emit = defineEmits<{ uploaded: [file: FileMeta]; removed: [] }>()

const { t } = useI18n()
const input = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const error = ref<string | null>(null)

const sizeLabel = computed(() =>
  props.file ? `${formatNumber(props.file.size / 1024, 0)} Ko` : ''
)

async function onPick(event: Event) {
  const picked = (event.target as HTMLInputElement).files?.[0]
  if (input.value) input.value.value = ''
  if (!picked) return
  const issue = fileIssue(picked, props.accept)
  if (issue) {
    error.value = t(`common.file.issue.${issue}`, { max: MAX_FILE_BYTES / 1024 / 1024 })
    return
  }
  uploading.value = true
  error.value = null
  try {
    emit('uploaded', (await fileApi.upload(picked)).data.data)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('common.file.uploadError'))
  } finally {
    uploading.value = false
  }
}

async function open() {
  if (!props.file) return
  try {
    await openStoredFile(props.file.no)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('common.file.openError'))
  }
}
</script>

<template>
  <div class="space-y-1">
    <div
      class="flex items-center gap-2 min-h-9 px-3 py-1.5 border rounded text-sm"
      :class="invalid ? 'border-destructive' : 'border-border'"
    >
      <Paperclip class="w-4 h-4 text-muted-foreground shrink-0" />
      <template v-if="file">
        <button
          type="button"
          class="truncate text-primary hover:underline text-left"
          :title="t('common.file.open')"
          @click="open"
        >
          {{ file.name }}
        </button>
        <span class="text-xs text-muted-foreground shrink-0">{{ sizeLabel }}</span>
        <ExternalLink class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </template>
      <span v-else class="text-muted-foreground">{{ t('common.file.none') }}</span>
      <div class="ml-auto flex items-center gap-1 shrink-0">
        <button
          v-if="!disabled"
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-accent disabled:opacity-50"
          :disabled="uploading"
          @click="input?.click()"
        >
          <Upload class="w-3.5 h-3.5" />
          {{ file ? t('common.file.replace') : t('common.file.choose') }}
        </button>
        <button
          v-if="!disabled && file"
          type="button"
          class="p-1 text-destructive rounded hover:bg-destructive/10"
          :aria-label="t('common.file.remove')"
          :title="t('common.file.remove')"
          @click="emit('removed')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
      <input ref="input" type="file" class="hidden" :accept="accept.join(',')" @change="onPick" />
    </div>
    <p v-if="uploading" class="text-xs text-muted-foreground">{{ t('common.file.uploading') }}</p>
    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
  </div>
</template>
