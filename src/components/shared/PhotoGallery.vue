<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ImagePlus, X } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { fileApi } from '@/core/api/fileApi'
import { openStoredFile, useFileObjectUrls } from '@/composables/useFileObjectUrls'
import type { FileMeta } from '@/types/file.types'
import { IMAGE_FILE_TYPES, MAX_FILE_BYTES, fileIssue } from '@/utils/fileRules'

const props = withDefaults(
  defineProps<{
    photos: FileMeta[]
    editable?: boolean
    max?: number
  }>(),
  { editable: false, max: 6 }
)
const emit = defineEmits<{ add: [photo: FileMeta]; remove: [no: string] }>()

const { t } = useI18n()
const { urls } = useFileObjectUrls(() => props.photos.map((photo) => photo.no))
const input = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const error = ref<string | null>(null)
const full = computed(() => props.photos.length >= props.max)

async function onPick(event: Event) {
  const picked = (event.target as HTMLInputElement).files?.[0]
  if (input.value) input.value.value = ''
  if (!picked) return
  const issue = fileIssue(picked, IMAGE_FILE_TYPES)
  if (issue) {
    error.value = t(`common.file.issue.${issue}`, { max: MAX_FILE_BYTES / 1024 / 1024 })
    return
  }
  uploading.value = true
  error.value = null
  try {
    emit('add', (await fileApi.upload(picked)).data.data)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('common.file.uploadError'))
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap gap-3">
      <div
        v-for="photo in photos"
        :key="photo.no"
        class="relative w-28 h-28 rounded border border-border overflow-hidden bg-muted"
      >
        <button
          type="button"
          class="w-full h-full"
          :title="photo.name"
          @click="openStoredFile(photo.no)"
        >
          <img
            v-if="urls[photo.no]"
            :src="urls[photo.no]"
            :alt="photo.name"
            class="w-full h-full object-cover"
          />
        </button>
        <button
          v-if="editable"
          type="button"
          class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
          :aria-label="t('common.file.remove')"
          :title="t('common.file.remove')"
          @click="emit('remove', photo.no)"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        v-if="editable && !full"
        type="button"
        class="w-28 h-28 rounded border border-dashed border-border flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
        :disabled="uploading"
        @click="input?.click()"
      >
        <ImagePlus class="w-6 h-6" />
        {{ uploading ? t('common.file.uploading') : t('common.file.addPhoto') }}
      </button>
      <input
        ref="input"
        type="file"
        class="hidden"
        :accept="IMAGE_FILE_TYPES.join(',')"
        @change="onPick"
      />
    </div>
    <p v-if="photos.length === 0 && !editable" class="text-sm text-muted-foreground">
      {{ t('common.file.noPhoto') }}
    </p>
    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
  </div>
</template>
