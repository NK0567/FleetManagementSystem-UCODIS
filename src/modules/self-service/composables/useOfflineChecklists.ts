import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { MyChecklistInput } from '../types/mySpace.types'

/** A checklist taken without network, kept on the phone with the trip it was taken for. */
export interface PendingChecklist extends MyChecklistInput {
  tripNo: string
  savedAt: string
}

const STORAGE_PREFIX = 'fms-pending-checklists:'

function readQueue(key: string): PendingChecklist[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? (parsed as PendingChecklist[]) : []
  } catch {
    return []
  }
}

function writeQueue(key: string, queue: readonly PendingChecklist[]) {
  try {
    if (queue.length) localStorage.setItem(key, JSON.stringify(queue))
    else localStorage.removeItem(key)
  } catch {
    // Storage refused: the queue stays in memory for this session.
  }
}

/**
 * Keeps the checklists a driver takes without network on the phone, and sends them, in the order
 * they were taken, as soon as the network is back. The mock-up runs its server in the browser, so
 * a cut can also be simulated from the page to show the behaviour.
 */
export function useOfflineChecklists(
  owner: () => string,
  send: (item: PendingChecklist) => Promise<boolean>
) {
  const browserOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
  const simulatedOffline = ref(false)
  const queue = ref<PendingChecklist[]>([])
  const syncing = ref(false)
  const lastSynced = ref(0)

  const storageKey = () => `${STORAGE_PREFIX}${owner()}`
  const online = computed(() => browserOnline.value && !simulatedOffline.value)

  function load() {
    queue.value = readQueue(storageKey())
  }

  function keep(item: Omit<PendingChecklist, 'savedAt'>) {
    queue.value = [...queue.value, { ...item, savedAt: new Date().toISOString() }]
    writeQueue(storageKey(), queue.value)
  }

  /** Sends what waits, oldest first; a refused one stays and stops the run. */
  async function synchronize() {
    if (!online.value || syncing.value || !queue.value.length) return
    syncing.value = true
    let sent = 0
    try {
      while (queue.value.length && online.value) {
        const [next] = queue.value
        if (!next || !(await send(next))) break
        queue.value = queue.value.slice(1)
        writeQueue(storageKey(), queue.value)
        sent++
      }
    } finally {
      syncing.value = false
      lastSynced.value = sent
    }
  }

  function setSimulatedOffline(value: boolean) {
    simulatedOffline.value = value
    if (!value) void synchronize()
  }

  const onOnline = () => {
    browserOnline.value = true
    void synchronize()
  }
  const onOffline = () => (browserOnline.value = false)

  onMounted(() => {
    load()
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    void synchronize()
  })
  onBeforeUnmount(() => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  })

  return {
    online,
    simulatedOffline,
    queue,
    syncing,
    lastSynced,
    keep,
    synchronize,
    setSimulatedOffline,
    load
  }
}
