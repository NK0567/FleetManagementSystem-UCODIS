<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'

interface ProfileDocument {
  no: string
  name: string
  number: string
  expiryDate: string | null
  state: string
}

interface ProfileBalance {
  leaveTypeNo: string
  leaveTypeName: string
  remainingDays: number
}

interface LeaveTypeChoice {
  no: string
  name: string
}

export interface MyProfile {
  employeeNo: string
  fullName: string
  phone: string
  jobPositionName: string
  siteName: string
  mayDeclare: boolean
  eligible: boolean
  ineligibilityReasons: string
  documentGaps: string
  documents: ProfileDocument[]
  leaveTypes: LeaveTypeChoice[]
  balances: ProfileBalance[]
}

const { t } = useI18n()
const profile = ref<MyProfile | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    profile.value = (await httpClient.get<SingleResponse<MyProfile>>('/me')).data.data
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('selfService.profile.loadError'))
  }
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <header class="px-4 py-3 border-b border-border">
      <h1 class="text-lg font-semibold">{{ t('selfService.profile.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('selfService.profile.subtitle') }}</p>
    </header>
    <FormAlerts class="mx-4 mt-3" :error="error" @clear:error="error = null" />
    <div v-if="profile" class="p-4 space-y-4 text-sm">
      <div>
        <p class="font-semibold">{{ profile.fullName }}</p>
        <p>{{ profile.jobPositionName }} · {{ profile.siteName }}</p>
        <p>{{ profile.phone }}</p>
        <p v-if="profile.eligible">{{ t('selfService.profile.eligible') }}</p>
        <p v-else>
          {{ t('selfService.profile.notEligible', { reasons: profile.ineligibilityReasons }) }}
        </p>
        <p v-if="profile.documentGaps">
          {{ t('selfService.profile.gaps', { gaps: profile.documentGaps }) }}
        </p>
      </div>
      <div>
        <h2 class="font-semibold mb-1">{{ t('selfService.profile.documents') }}</h2>
        <p v-if="profile.documents.length === 0">{{ t('selfService.profile.noDocument') }}</p>
        <ul v-else class="space-y-1">
          <li v-for="document in profile.documents" :key="document.no">
            {{ document.name }} {{ document.number }}
            <span v-if="document.expiryDate">· {{ document.expiryDate }}</span>
            · {{ t(`selfService.document.${document.state}`) }}
          </li>
        </ul>
      </div>
      <div>
        <h2 class="font-semibold mb-1">{{ t('selfService.profile.balances') }}</h2>
        <ul class="space-y-1">
          <li v-for="balance in profile.balances" :key="balance.leaveTypeNo">
            {{
              t('selfService.profile.balance', balance.remainingDays, {
                name: balance.leaveTypeName
              })
            }}
          </li>
        </ul>
      </div>
      <router-link class="text-primary underline block" to="/me/tour">
        {{ t('selfService.tour.title') }}
      </router-link>
      <router-link class="text-primary underline" to="/me/absences">
        {{ t('selfService.profile.absences') }}
      </router-link>
    </div>
  </div>
</template>
