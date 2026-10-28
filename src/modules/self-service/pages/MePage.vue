<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileText,
  MapPin,
  Phone,
  Route,
  TriangleAlert
} from '@lucide/vue'
import { formatDate } from '@/utils/format'
import MyLeaveBalances from '../components/MyLeaveBalances.vue'
import { useMySpaceStore } from '../stores/mySpaceStore'

const { t } = useI18n()
const store = useMySpaceStore()

const initials = computed(() =>
  (store.profile?.fullName ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
)

const shortcuts = computed(() => [
  { to: '/me/tour', icon: Route, label: t('selfService.tour.title') },
  { to: '/me/checklist', icon: ClipboardCheck, label: t('selfService.checklist.title') },
  { to: '/me/absences', icon: CalendarDays, label: t('selfService.profile.absences') }
])

onMounted(() => void store.fetchProfile())
</script>

<template>
  <div class="px-2 py-4 space-y-4 w-full max-w-3xl mx-auto">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">
        {{ t('selfService.profile.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">{{ t('selfService.profile.subtitle') }}</p>
    </header>

    <FormAlerts :error="store.error" @clear:error="store.clearError" />
    <LoadingSpinner v-if="store.loading && !store.profile" :text="t('common.loading')" />

    <template v-if="store.profile">
      <section class="bg-card border border-border rounded p-4 space-y-3">
        <div class="flex items-start gap-3">
          <span
            class="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold shrink-0"
          >
            {{ initials }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-lg font-semibold text-card-foreground truncate">
              {{ store.profile.fullName }}
            </p>
            <p class="text-xs text-muted-foreground">{{ store.profile.employeeNo }}</p>
          </div>
          <StatusPill
            :label="
              store.profile.eligible
                ? t('selfService.profile.eligible')
                : t('selfService.profile.notEligible')
            "
            :tone="store.profile.eligible ? 'success' : 'danger'"
          />
        </div>

        <ul class="space-y-2 text-sm text-card-foreground">
          <li v-if="store.profile.jobPositionName" class="flex items-center gap-2">
            <Briefcase class="w-4 h-4 text-muted-foreground shrink-0" />
            {{ store.profile.jobPositionName }}
          </li>
          <li v-if="store.profile.siteName" class="flex items-center gap-2">
            <MapPin class="w-4 h-4 text-muted-foreground shrink-0" />
            {{ store.profile.siteName }}
          </li>
          <li v-if="store.profile.phone" class="flex items-center gap-2">
            <Phone class="w-4 h-4 text-muted-foreground shrink-0" />
            <a :href="`tel:${store.profile.phone}`" class="text-primary hover:underline">
              {{ store.profile.phone }}
            </a>
          </li>
        </ul>

        <p
          v-if="!store.profile.eligible && store.profile.ineligibilityReasons"
          class="flex items-start gap-2 rounded bg-destructive/10 text-destructive px-3 py-2 text-sm"
        >
          <TriangleAlert class="w-4 h-4 mt-0.5 shrink-0" />
          {{ t('selfService.profile.reasons', { reasons: store.profile.ineligibilityReasons }) }}
        </p>
        <p
          v-if="store.profile.documentGaps"
          class="flex items-start gap-2 rounded bg-warning-bg text-warning px-3 py-2 text-sm"
        >
          <TriangleAlert class="w-4 h-4 mt-0.5 shrink-0" />
          {{ t('selfService.profile.gaps', { gaps: store.profile.documentGaps }) }}
        </p>
      </section>

      <nav
        class="grid grid-cols-1 sm:grid-cols-3 gap-3"
        :aria-label="t('selfService.profile.shortcuts')"
      >
        <RouterLink
          v-for="shortcut in shortcuts"
          :key="shortcut.to"
          :to="shortcut.to"
          class="bg-card border border-border rounded p-4 min-h-14 flex items-center gap-3 hover:bg-accent transition"
        >
          <span class="p-2 rounded bg-primary/10 text-primary shrink-0">
            <component :is="shortcut.icon" class="w-5 h-5" />
          </span>
          <span class="flex-1 text-sm font-medium text-card-foreground">{{ shortcut.label }}</span>
          <ChevronRight class="w-4 h-4 text-muted-foreground shrink-0" />
        </RouterLink>
      </nav>

      <section class="bg-card border border-border rounded">
        <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
          {{ t('selfService.profile.documents') }}
        </h2>
        <p v-if="!store.profile.documents.length" class="p-4 text-sm text-muted-foreground">
          {{ t('selfService.profile.noDocument') }}
        </p>
        <ul v-else class="divide-y divide-border">
          <li
            v-for="document in store.profile.documents"
            :key="document.no"
            class="px-4 py-3 flex items-center gap-3"
          >
            <FileText class="w-5 h-5 text-primary shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-card-foreground truncate">{{ document.name }}</p>
              <p class="text-xs text-muted-foreground truncate">
                <span v-if="document.number">{{ document.number }} · </span>
                {{
                  document.expiryDate
                    ? t('selfService.profile.expiresOn', { date: formatDate(document.expiryDate) })
                    : t('selfService.profile.noExpiry')
                }}
              </p>
            </div>
            <DocumentStatePill :state="document.state" />
          </li>
        </ul>
      </section>

      <MyLeaveBalances :balances="store.profile.balances" />
    </template>
  </div>
</template>
