import { ref } from 'vue'
import httpClient from '@/core/api/httpClient'

/** The name shown next to the logo; empty means the logo stands alone. */
const brandName = ref('')
let loaded = false

async function load(): Promise<void> {
  try {
    const response = await httpClient.get<{ data: { displayName: string } }>('/settings/brand')
    brandName.value = response.data.data.displayName ?? ''
    loaded = true
  } catch {
    // Without the setting the logo is simply shown alone.
  }
}

export function useBrandName() {
  if (!loaded) void load()
  return {
    brandName,
    setBrandName(value: string) {
      brandName.value = value.trim()
    }
  }
}
