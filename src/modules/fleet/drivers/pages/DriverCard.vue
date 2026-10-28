<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { UserRound } from '@lucide/vue'
import { useEntityCard } from '@/composables/useEntityCard'
import type { EntityFormExpose } from '@/composables/useEntityForm'
import { usePermissions } from '@/composables/usePermissions'
import { driverService } from '../services/driverService'
import { useDriverStore } from '../stores/driverStore'

const props = defineProps<{ driverNo: string }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = useDriverStore()
const { canRead: canReadEmployee } = usePermissions('EMPLOYEE')

/** Drivers are HR employees: their record is edited in the employee card. */
const noForm = ref<EntityFormExpose | null>(null)
const canEdit = computed(() => false)

const {
  item,
  isLoading,
  errorMsg,
  saveError,
  hasPrev,
  hasNext,
  sidebarItems,
  goTo,
  goToPrev,
  goToNext
} = useEntityCard({
  no: () => props.driverNo,
  store,
  form: noForm,
  update: driverService.update,
  canUpdate: canEdit,
  label: (driver) => driver.fullName,
  saveErrorFallback: t('fleet.drivers.loadError')
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.fullName}` : t('fleet.drivers.card')
)

const employeeLink = computed(() =>
  item.value ? { path: '/hr/employees', query: { no: item.value.no, cardMode: 'view' } } : null
)
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.drivers.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="false"
    :is-saving="false"
    :actions-disabled="isLoading"
    :save-error="saveError"
    :save-success="false"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="false"
    :show-title-new-button="false"
    :has-unsaved-changes="false"
    :can-save="false"
    @close="emit('close')"
    @go-prev="goToPrev"
    @go-next="goToNext"
    @select-sidebar="goTo"
    @clear-save-error="saveError = null"
  >
    <template #title-badges>
      <DriverAvailabilityPill v-if="item" :availability="item.availability" />
    </template>
    <template v-if="item && canReadEmployee && employeeLink" #action-buttons>
      <RouterLink
        :to="employeeLink"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition"
      >
        <UserRound class="w-5 h-5 text-primary" /> {{ t('fleet.drivers.action.openEmployee') }}
      </RouterLink>
    </template>
    <template #form>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <DriverOverview v-if="item" :driver="item" />
      </div>
    </template>
  </CardModalShell>
</template>
