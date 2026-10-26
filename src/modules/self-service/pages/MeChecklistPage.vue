<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { MyProfile } from './MePage.vue'

interface CheckPoint {
  no: string
  label: string
  blocking: boolean
}

interface Tour {
  tripNo: string
  vehiclePlate: string
  checkPoints: CheckPoint[]
}

const { t } = useI18n()
const profile = ref<MyProfile | null>(null)
const tour = ref<Tour | null>(null)
const loaded = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const sending = ref(false)
const takenAt = ref('')
const answers = ref<Record<string, { result: 'ok' | 'anomaly'; comment: string }>>({})

onMounted(async () => {
  try {
    profile.value = (await httpClient.get<SingleResponse<MyProfile>>('/me')).data.data
    tour.value = (await httpClient.get<SingleResponse<Tour | null>>('/me/tour')).data.data
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('selfService.checklist.loadError'))
  } finally {
    loaded.value = true
  }
})

function answer(pointNo: string, result: 'ok' | 'anomaly') {
  const current = answers.value[pointNo]
  answers.value = { ...answers.value, [pointNo]: { result, comment: current?.comment ?? '' } }
}

async function submit() {
  if (!tour.value) return
  sending.value = true
  error.value = null
  notice.value = null
  try {
    await httpClient.post('/me/checklist', {
      stage: 'departure',
      takenAt: takenAt.value,
      results: tour.value.checkPoints.map((point) => ({
        pointNo: point.no,
        result: answers.value[point.no]?.result ?? null,
        comment: answers.value[point.no]?.comment ?? ''
      }))
    })
    notice.value = t('selfService.checklist.sent')
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('selfService.checklist.loadError'))
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <header class="px-4 py-3 border-b border-border">
      <h1 class="text-lg font-semibold">{{ t('selfService.checklist.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('selfService.checklist.subtitle') }}</p>
    </header>
    <FormAlerts
      class="mx-4 mt-3"
      :error="error"
      :success="notice"
      @clear:error="error = null"
      @clear:success="notice = null"
    />
    <div v-if="loaded && !tour" class="p-4 text-sm">{{ t('selfService.checklist.empty') }}</div>
    <form v-if="tour && profile" class="p-4 space-y-3 text-sm" @submit.prevent="submit">
      <p>{{ tour.tripNo }} · {{ tour.vehiclePlate }}</p>
      <p v-if="!profile.mayDeclare">{{ t('selfService.checklist.readOnly') }}</p>
      <template v-else>
        <label>
          {{ t('selfService.checklist.takenAt') }}
          <input
            v-model="takenAt"
            class="block border border-border rounded-md px-2 py-1"
            type="datetime-local"
            required
          />
        </label>
        <div v-for="point in tour.checkPoints" :key="point.no" class="border-b border-border py-2">
          <p>{{ point.label }}</p>
          <button type="button" @click="answer(point.no, 'ok')">
            {{ t('selfService.checklist.ok') }}
          </button>
          <button type="button" @click="answer(point.no, 'anomaly')">
            {{ t('selfService.checklist.anomaly') }}
          </button>
          <input
            class="block w-full border border-border rounded-md px-2 py-1 mt-1"
            :placeholder="t('selfService.checklist.comment')"
            :value="answers[point.no]?.comment ?? ''"
            @input="
              answers[point.no] = {
                result: answers[point.no]?.result ?? 'ok',
                comment: ($event.target as HTMLInputElement).value
              }
            "
          />
        </div>
        <button
          class="px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
          :disabled="sending"
          type="submit"
        >
          {{ t('selfService.checklist.submit') }}
        </button>
      </template>
    </form>
  </div>
</template>
