import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/user'

/** The profiles that work on a tablet in the field. */
const TABLET_PROFILES = ['DRIVER', 'DRIVER_ASSISTANT']

type DisplayChoice = 'tablet' | 'desktop' | null

/* The choice made by hand during the session. Nothing chosen: the profile decides. */
const choice = ref<DisplayChoice>(null)

/**
 * Tablet mode: controls sized for a finger and a narrower page. A driver gets it by default,
 * since the drivers work on a tablet; anyone can switch it on or off for the session.
 */
export function useTabletMode() {
  const userStore = useUserStore()
  const byProfile = computed(() => TABLET_PROFILES.includes(userStore.user?.profile ?? ''))
  const isTablet = computed(() => (choice.value ? choice.value === 'tablet' : byProfile.value))

  function toggleTablet() {
    choice.value = isTablet.value ? 'desktop' : 'tablet'
  }

  /** On sign-out the profile decides again: the next driver on this screen gets his tablet mode. */
  function resetChoice() {
    choice.value = null
  }

  return { isTablet, toggleTablet, resetChoice }
}
