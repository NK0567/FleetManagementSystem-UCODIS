<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleCheck, Clock, TriangleAlert, UserX, Users } from '@lucide/vue'
import { formatDate } from '@/utils/format'
import { useHrDashboardStore } from '../stores/hrDashboardStore'

const { t } = useI18n()
const store = useHrDashboardStore()

const kpis = computed(() => {
  const dashboard = store.dashboard
  if (!dashboard) return []
  return [
    {
      key: 'staff',
      icon: Users,
      value: dashboard.headcount.onStaff,
      label: t('hr.dashboard.kpi.onStaff'),
      sub: t('hr.dashboard.kpi.drivers', { count: dashboard.headcount.drivers })
    },
    {
      key: 'pending',
      icon: Clock,
      value: dashboard.leave.pending,
      label: t('hr.dashboard.kpi.pending'),
      sub: t('hr.dashboard.kpi.pendingSub')
    },
    {
      key: 'approved',
      icon: CircleCheck,
      value: dashboard.leave.approvedThisMonth,
      label: t('hr.dashboard.kpi.approvedThisMonth'),
      sub: t('hr.dashboard.kpi.approvedSub')
    },
    {
      key: 'absent',
      icon: UserX,
      value: dashboard.leave.absentToday,
      label: t('hr.dashboard.kpi.absentToday'),
      sub: t('hr.dashboard.kpi.absentSub', { count: dashboard.headcount.onStaff })
    }
  ]
})

const attentionCount = computed(() => {
  const attention = store.dashboard?.attention
  if (!attention) return 0
  return (
    attention.pendingOrgUnits.length +
    attention.unauthorizedDrivers.length +
    attention.understaffedPositions.length
  )
})

onMounted(() => void store.fetchDashboard())
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">{{ t('hr.dashboard.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('hr.dashboard.subtitle') }}</p>
    </header>

    <FormAlerts :error="store.error" />
    <LoadingSpinner v-if="store.loading && !store.dashboard" :text="t('common.loading')" />

    <template v-if="store.dashboard">
      <section class="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div
          v-for="kpi in kpis"
          :key="kpi.key"
          class="bg-card border border-border rounded p-4 flex items-start gap-3"
        >
          <span class="p-2 rounded bg-primary/10 text-primary shrink-0">
            <component :is="kpi.icon" class="w-5 h-5" />
          </span>
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">{{ kpi.label }}</p>
            <p
              class="text-2xl font-semibold tabular-nums"
              :class="kpi.value ? 'text-card-foreground' : 'text-muted-foreground/60'"
            >
              {{ kpi.value }}
            </p>
            <p class="text-xs text-muted-foreground truncate">{{ kpi.sub }}</p>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div class="bg-card border border-border rounded">
          <div class="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 class="text-sm font-semibold text-card-foreground">
              {{ t('hr.dashboard.pendingRequests') }}
            </h2>
            <RouterLink to="/hr/leave-requests" class="text-xs text-primary hover:underline">
              {{ t('hr.dashboard.seeAll') }}
            </RouterLink>
          </div>
          <ul v-if="store.dashboard.leave.pendingRequests.length" class="divide-y divide-border">
            <li v-for="request in store.dashboard.leave.pendingRequests" :key="request.no">
              <RouterLink
                :to="{ path: '/hr/leave-requests', query: { no: request.no } }"
                class="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent"
              >
                <span class="min-w-0">
                  <span class="block text-sm font-medium text-card-foreground truncate">
                    {{ request.employeeName }}
                  </span>
                  <span class="block text-xs text-muted-foreground truncate">
                    {{ request.leaveTypeName }} · {{ formatDate(request.startDate) }} →
                    {{ formatDate(request.endDate) }}
                  </span>
                </span>
                <span class="text-xs text-muted-foreground shrink-0">
                  {{ t('hr.leaveRequests.form.dayCount', request.days) }}
                </span>
              </RouterLink>
            </li>
          </ul>
          <p v-else class="px-4 py-6 text-sm text-muted-foreground">
            {{ t('hr.dashboard.noPending') }}
          </p>
        </div>

        <div class="bg-card border border-border rounded">
          <div class="px-4 py-3 border-b border-border">
            <h2 class="text-sm font-semibold text-card-foreground">
              {{ t('hr.dashboard.upcoming') }}
            </h2>
          </div>
          <ul v-if="store.dashboard.leave.upcoming.length" class="divide-y divide-border">
            <li v-for="leave in store.dashboard.leave.upcoming" :key="leave.no">
              <RouterLink
                :to="{ path: '/hr/leave-requests', query: { no: leave.no } }"
                class="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent"
              >
                <span class="min-w-0">
                  <span class="block text-sm font-medium text-card-foreground truncate">
                    {{ leave.employeeName }}
                  </span>
                  <span class="block text-xs text-muted-foreground truncate">
                    {{ leave.leaveTypeName }}
                  </span>
                </span>
                <span class="text-xs text-muted-foreground shrink-0">
                  {{ formatDate(leave.startDate) }} → {{ formatDate(leave.endDate) }}
                </span>
              </RouterLink>
            </li>
          </ul>
          <p v-else class="px-4 py-6 text-sm text-muted-foreground">
            {{ t('hr.dashboard.noUpcoming') }}
          </p>
        </div>

        <div class="bg-card border border-border rounded">
          <div class="flex items-center gap-2 px-4 py-3 border-b border-border">
            <TriangleAlert class="w-4 h-4 text-warning" />
            <h2 class="text-sm font-semibold text-card-foreground">
              {{ t('hr.dashboard.attention') }}
            </h2>
          </div>
          <div v-if="attentionCount" class="px-4 py-3 space-y-3 text-sm">
            <div v-if="store.dashboard.attention.pendingOrgUnits.length">
              <p class="text-xs font-semibold text-muted-foreground uppercase mb-1">
                {{ t('hr.dashboard.pendingOrgUnits') }}
              </p>
              <RouterLink
                v-for="unit in store.dashboard.attention.pendingOrgUnits"
                :key="unit.no"
                :to="{ path: '/hr/org-units', query: { no: unit.no } }"
                class="block text-primary hover:underline"
              >
                {{ unit.no }} · {{ unit.name }}
              </RouterLink>
            </div>
            <div v-if="store.dashboard.attention.unauthorizedDrivers.length">
              <p class="text-xs font-semibold text-muted-foreground uppercase mb-1">
                {{ t('hr.dashboard.unauthorizedDrivers') }}
              </p>
              <RouterLink
                v-for="driver in store.dashboard.attention.unauthorizedDrivers"
                :key="driver.no"
                :to="{ path: '/hr/employees', query: { no: driver.no } }"
                class="block text-primary hover:underline"
              >
                {{ driver.no }} · {{ driver.fullName }}
              </RouterLink>
            </div>
            <div v-if="store.dashboard.attention.understaffedPositions.length">
              <p class="text-xs font-semibold text-muted-foreground uppercase mb-1">
                {{ t('hr.dashboard.understaffedPositions') }}
              </p>
              <RouterLink
                v-for="position in store.dashboard.attention.understaffedPositions"
                :key="position.no"
                :to="{ path: '/hr/job-positions', query: { no: position.no } }"
                class="block text-primary hover:underline"
              >
                {{ position.name }} ·
                {{ t('hr.dashboard.openPositions', position.headcountGap) }}
              </RouterLink>
            </div>
          </div>
          <p v-else class="px-4 py-6 text-sm text-muted-foreground">
            {{ t('hr.dashboard.nothingToFollow') }}
          </p>
        </div>

        <div class="bg-card border border-border rounded">
          <div class="px-4 py-3 border-b border-border">
            <h2 class="text-sm font-semibold text-card-foreground">
              {{ t('hr.dashboard.headcountByUnit') }}
            </h2>
          </div>
          <table class="w-full text-sm">
            <tbody class="divide-y divide-border">
              <tr v-for="unit in store.dashboard.headcountByUnit" :key="unit.no">
                <td class="px-4 py-2 text-card-foreground">{{ unit.name }}</td>
                <td class="px-4 py-2 text-right tabular-nums font-medium">{{ unit.headcount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
