import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import type { LeaveRequestApi } from '@/modules/hr/leave-requests'
import { mySpaceService } from '../services/mySpaceService'
import type {
  MyAbsenceInput,
  MyChecklistInput,
  MyProfileApi,
  MyTourApi
} from '../types/mySpace.types'

export const useMySpaceStore = defineStore('self-service-my-space', () => {
  const profile = ref<MyProfileApi | null>(null)
  const tour = ref<MyTourApi | null>(null)
  const tourLoaded = ref(false)
  const absences = ref<LeaveRequestApi[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const notice = ref<string | null>(null)

  async function run(errorKey: string, task: () => Promise<void>) {
    loading.value = true
    error.value = null
    try {
      await task()
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t(errorKey))
    } finally {
      loading.value = false
    }
  }

  const fetchProfile = () =>
    run('selfService.profile.loadError', async () => {
      profile.value = await mySpaceService.profile()
    })

  const fetchTour = () =>
    run('selfService.tour.loadError', async () => {
      try {
        tour.value = await mySpaceService.tour()
      } finally {
        tourLoaded.value = true
      }
    })

  const fetchChecklist = () =>
    run('selfService.checklist.loadError', async () => {
      try {
        const [me, current] = await Promise.all([mySpaceService.profile(), mySpaceService.tour()])
        profile.value = me
        tour.value = current
      } finally {
        tourLoaded.value = true
      }
    })

  const fetchAbsences = () =>
    run('selfService.absences.loadError', async () => {
      const [me, requests] = await Promise.all([
        mySpaceService.profile(),
        mySpaceService.absences()
      ])
      profile.value = me
      absences.value = requests
    })

  /** Returns true once the server accepted the action, so the page can close its dialog. */
  async function save(errorKey: string, noticeKey: string, task: () => Promise<void>) {
    saving.value = true
    error.value = null
    notice.value = null
    try {
      await task()
      notice.value = i18n.global.t(noticeKey)
      return true
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t(errorKey))
      return false
    } finally {
      saving.value = false
    }
  }

  async function requestAbsence(input: MyAbsenceInput): Promise<boolean> {
    const employeeNo = profile.value?.employeeNo
    if (!employeeNo) return false
    const done = await save('selfService.absences.sendError', 'selfService.absences.sent', () =>
      mySpaceService.requestAbsence(employeeNo, input).then(() => undefined)
    )
    if (done) await fetchAbsences()
    return done
  }

  async function saveChecklist(input: MyChecklistInput): Promise<boolean> {
    const done = await save('selfService.checklist.sendError', 'selfService.checklist.sent', () =>
      mySpaceService.saveChecklist(input)
    )
    if (done) await fetchChecklist()
    return done
  }

  const clearError = () => (error.value = null)
  const clearNotice = () => (notice.value = null)

  return {
    profile,
    tour,
    tourLoaded,
    absences,
    loading,
    saving,
    error,
    notice,
    fetchProfile,
    fetchTour,
    fetchChecklist,
    fetchAbsences,
    requestAbsence,
    saveChecklist,
    clearError,
    clearNotice
  }
})
