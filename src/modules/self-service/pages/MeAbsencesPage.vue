<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { MyProfile } from './MePage.vue'

interface Absence {
  no: string
  leaveTypeName: string
  startDate: string
  endDate: string
  status: string
  reason: string
}

const { t } = useI18n()
const profile = ref<MyProfile | null>(null)
const requests = ref<Absence[]>([])
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const sending = ref(false)
const form = ref({ leaveTypeNo: '', startDate: '', endDate: '', reason: '' })

async function load() {
  profile.value = (await httpClient.get<SingleResponse<MyProfile>>('/me')).data.data
  const list = await httpClient.get<SingleResponse<{ items: Absence[] }>>('/hr/leave-requests', {
    params: { pageSize: 100 }
  })
  requests.value = list.data.data.items
  if (!form.value.leaveTypeNo && profile.value.leaveTypes[0]) {
    form.value.leaveTypeNo = profile.value.leaveTypes[0].no
  }
}

onMounted(async () => {
  try {
    await load()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('selfService.absences.loadError'))
  }
})

async function submit() {
  if (!profile.value) return
  sending.value = true
  error.value = null
  notice.value = null
  try {
    await httpClient.post('/hr/leave-requests', {
      employeeNo: profile.value.employeeNo,
      ...form.value
    })
    notice.value = t('selfService.absences.sent')
    form.value.reason = ''
    await load()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('selfService.absences.loadError'))
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <header class="px-4 py-3 border-b border-border">
      <h1 class="text-lg font-semibold">{{ t('selfService.absences.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('selfService.absences.subtitle') }}</p>
    </header>
    <FormAlerts
      class="mx-4 mt-3"
      :error="error"
      :success="notice"
      @clear:error="error = null"
      @clear:success="notice = null"
    />
    <div v-if="profile" class="p-4 space-y-4 text-sm">
      <ul class="space-y-1">
        <li v-for="balance in profile.balances" :key="balance.leaveTypeNo">
          {{
            t(
              'selfService.profile.balance',
              { name: balance.leaveTypeName, count: balance.remainingDays },
              balance.remainingDays
            )
          }}
        </li>
      </ul>
      <p v-if="requests.length === 0">{{ t('selfService.absences.empty') }}</p>
      <ul v-else class="space-y-1">
        <li v-for="request in requests" :key="request.no">
          {{ request.leaveTypeName }} · {{ request.startDate }} → {{ request.endDate }} ·
          {{ t(`selfService.absences.status.${request.status}`) }}
        </li>
      </ul>
      <form class="grid gap-2 max-w-sm" @submit.prevent="submit">
        <label>
          {{ t('selfService.absences.type') }}
          <select
            v-model="form.leaveTypeNo"
            class="block w-full border border-border rounded-md px-2 py-1"
            required
          >
            <option v-for="type in profile.leaveTypes" :key="type.no" :value="type.no">
              {{ type.name }}
            </option>
          </select>
        </label>
        <label>
          {{ t('selfService.absences.from') }}
          <input
            v-model="form.startDate"
            class="block w-full border border-border rounded-md px-2 py-1"
            type="date"
            required
          />
        </label>
        <label>
          {{ t('selfService.absences.to') }}
          <input
            v-model="form.endDate"
            class="block w-full border border-border rounded-md px-2 py-1"
            type="date"
            required
          />
        </label>
        <label>
          {{ t('selfService.absences.reason') }}
          <input
            v-model="form.reason"
            class="block w-full border border-border rounded-md px-2 py-1"
            required
          />
        </label>
        <button
          class="px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
          :disabled="sending"
          type="submit"
        >
          {{ t('selfService.absences.submit') }}
        </button>
      </form>
    </div>
  </div>
</template>
