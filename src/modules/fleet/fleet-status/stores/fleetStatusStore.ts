import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createCrudService, makeViewAsFilters, useCrudState } from '@/core/factories'
import type { ListFilter } from '@/core/types/crud.types'
import { todayIso } from '@/utils/date'
import { createFleetStatusApi, fleetStatusDayApi } from '../api/fleetStatusApi'
import type { FleetStateGroup } from '../domain/fleetState'
import type {
  FleetStatusApi,
  FleetStatusDay,
  FleetStatusDispatchApi,
  FleetStatusSearchColumn
} from '../types/fleetStatus.types'

export type FleetStatusListView = FleetStateGroup | 'all'

function viewFilters(view: FleetStatusListView): ListFilter[] {
  return view === 'all' ? [] : [{ field: 'stateGroup', valueType: 'string', value: [view] }]
}

function detectView(filters: ListFilter[]): FleetStatusListView {
  const value = filters.find((filter) => filter.field === 'stateGroup')?.value
  return Array.isArray(value) && value.length === 1 ? (value[0] as FleetStateGroup) : 'all'
}

export const useFleetStatusStore = defineStore('fleet-fleet-status', () => {
  const day = ref(todayIso())
  const days = ref<FleetStatusDay[]>([])
  const dispatches = ref<FleetStatusDispatchApi[]>([])
  const api = createFleetStatusApi(() => day.value)
  const service = createCrudService<FleetStatusApi, FleetStatusSearchColumn>(api)

  const crud = useCrudState<FleetStatusApi, FleetStatusSearchColumn>({
    persistKey: 'fleet-fleet-status',
    service,
    defaultSearchColumn: 'no,plate,driverName',
    entityLabelKey: 'fleet.fleetStatus.title',
    defaultSortBy: 'no'
  })

  const { listView, setListView } = makeViewAsFilters<FleetStatusListView>({
    userFilters: crud.userFilters,
    setUserFilters: crud.setUserFilters,
    managedFields: ['stateGroup'],
    buildViewFilters: viewFilters,
    detect: detectView
  })

  const currentDay = computed(() => days.value.find((entry) => entry.date === day.value) ?? null)
  const isLive = computed(() => day.value === todayIso())

  async function fetchDays() {
    days.value = (await fleetStatusDayApi.days()).data.data
  }

  async function setDay(next: string) {
    day.value = next
    crud.selectItem(null)
    await crud.fetchItems(1)
  }

  async function archive() {
    await fleetStatusDayApi.archive()
    await fetchDays()
  }

  async function fetchDispatches() {
    dispatches.value = (await fleetStatusDayApi.dispatches()).data.data
  }

  /** Sends the status of the day shown; today's status is archived as it was sent. */
  async function send(recipients: string[]) {
    await fleetStatusDayApi.send(day.value, recipients)
    await Promise.all([fetchDispatches(), fetchDays()])
  }

  async function saveNote(vehicleNo: string, observation: string, expectedBackOn: string | null) {
    const line = (await fleetStatusDayApi.saveNote(vehicleNo, observation, expectedBackOn)).data
      .data
    await crud.fetchItems(crud.pagination.value.page, crud.pagination.value.limit)
    crud.selectItem(line)
  }

  return {
    ...crud,
    listView,
    setListView,
    day,
    days,
    dispatches,
    currentDay,
    isLive,
    fetchDays,
    setDay,
    archive,
    fetchDispatches,
    send,
    saveNote,
    exportExcel: api.exportExcel
  }
})
