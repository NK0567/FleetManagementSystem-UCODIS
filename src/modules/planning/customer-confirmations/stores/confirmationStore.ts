import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/core/i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { confirmationService } from '../services/confirmationService'
import type {
  ActionBody,
  AnsweredLineApi,
  ConfirmationAction,
  ConfirmationLineApi,
  ReceptionAction,
  ReceptionLineApi
} from '../types/confirmation.types'

export const useConfirmationStore = defineStore('planning-customer-confirmation', () => {
  const lines = ref<ConfirmationLineApi[]>([])
  const receptions = ref<ReceptionLineApi[]>([])
  const answered = ref<AnsweredLineApi[]>([])
  const loading = ref(false)
  const acting = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const [confirmations, received, given] = await Promise.all([
        confirmationService.list(),
        confirmationService.receptions(),
        confirmationService.answered()
      ])
      lines.value = confirmations
      receptions.value = received
      answered.value = given
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.confirmations.loadError'))
    } finally {
      loading.value = false
    }
  }

  async function perform(call: () => Promise<void>): Promise<boolean> {
    acting.value = true
    error.value = null
    try {
      await call()
      await fetchAll()
      return true
    } catch (cause) {
      error.value = apiErrorMessage(cause, i18n.global.t('planning.confirmations.saveError'))
      return false
    } finally {
      acting.value = false
    }
  }

  const act = (line: ConfirmationLineApi, action: ConfirmationAction, body: ActionBody = {}) =>
    perform(() => confirmationService.act(line, action, body))
  const receive = (line: ReceptionLineApi, action: ReceptionAction, body: ActionBody) =>
    perform(() => confirmationService.receive(line, action, body))

  const confirm = (line: ConfirmationLineApi) => act(line, 'confirm')
  const take = (line: ConfirmationLineApi) => act(line, 'take')
  const release = (line: ConfirmationLineApi) => act(line, 'release')
  const markUnavailable = (line: ConfirmationLineApi, reason: ActionBody) =>
    act(line, 'unavailable', reason)
  const setClientDate = (line: ConfirmationLineApi, date: string) =>
    act(line, 'client-date', { date })

  const confirmReception = (line: ReceptionLineApi, signer: string) =>
    receive(line, 'receive-confirm', { signer })
  const contestReception = (line: ReceptionLineApi, reason: ActionBody) =>
    receive(line, 'receive-contest', reason)
  const handleContest = (line: ReceptionLineApi, note: string) =>
    receive(line, 'handle-contest', { note })
  const rateSatisfaction = (line: ReceptionLineApi, score: number, comment: string) =>
    receive(line, 'satisfaction', { score, comment })

  return {
    lines,
    receptions,
    answered,
    loading,
    acting,
    error,
    fetchAll,
    confirm,
    take,
    release,
    markUnavailable,
    setClientDate,
    confirmReception,
    contestReception,
    handleContest,
    rateSatisfaction
  }
})
