import { useAppBootstrapStore } from '@/stores/appBootstrapStore'

export function signalCardBootstrapReady(): void {
  useAppBootstrapStore().cardReady()
}
