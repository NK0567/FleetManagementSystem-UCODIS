import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import type { WorkingDay } from '../domain/workingDays'
import { workingCalendarService } from '../services/workingCalendarService'
import type { WorkingCalendarApi } from '../types/workingCalendar.types'

/** A single record, so no list state: the calendar is read and replaced as a whole. */
export const useWorkingCalendarStore = defineStore('hr-working-calendar', () => {
  const calendar = ref<WorkingCalendarApi | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const saving = ref(false)
  const saveError = ref<string | null>(null)

  async function fetchCalendar() {
    loading.value = true
    error.value = null
    try {
      calendar.value = await workingCalendarService.get()
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('hr.workingCalendar.loadError'))
    } finally {
      loading.value = false
    }
  }

  async function saveDays(days: WorkingDay[]): Promise<boolean> {
    saving.value = true
    saveError.value = null
    try {
      calendar.value = await workingCalendarService.update(days)
      return true
    } catch (cause) {
      saveError.value = apiErrorMessage(cause, i18n.global.t('hr.workingCalendar.saveError'))
      return false
    } finally {
      saving.value = false
    }
  }

  return { calendar, loading, error, saving, saveError, fetchCalendar, saveDays }
})
