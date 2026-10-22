<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Globe, LogOut, Search, Settings } from '@lucide/vue'
import { useAuth } from '@/composables/useAuth'
import { useCommandPalette } from '@/composables/useCommandPalette'
import { usePermissions } from '@/composables/usePermissions'
import { appConfig } from '@/core/app/appConfig'
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/core/i18n'
import { reloadApplicationForLocale } from '@/core/bootstrap/reloadApplicationForLocale'
import { useUserStore } from '@/stores/user'

const SETTINGS_PATH = '/settings/module-toggles'

const { t, locale } = useI18n()
const userStore = useUserStore()
const { logout } = useAuth()
const { open: openPalette } = useCommandPalette()
const { canRead: canOpenSettings } = usePermissions('MODULETOGGLE')

const userName = computed(() => userStore.user?.name ?? '')
const userInitial = computed(() => userName.value.charAt(0).toUpperCase() || '?')
const isProfileOpen = ref(false)
const isLangOpen = ref(false)
const showLogoutConfirm = ref(false)

function toggleProfile() {
  isProfileOpen.value = !isProfileOpen.value
  isLangOpen.value = false
}

function toggleLang() {
  isLangOpen.value = !isLangOpen.value
  isProfileOpen.value = false
}

function closeAll() {
  isProfileOpen.value = false
  isLangOpen.value = false
}

function changeLocale(code: SupportedLocale) {
  isLangOpen.value = false
  if (locale.value !== code) reloadApplicationForLocale(code)
}

function onLogoutClick() {
  isProfileOpen.value = false
  showLogoutConfirm.value = true
}

function onConfirmLogout() {
  showLogoutConfirm.value = false
  logout()
}
</script>

<template>
  <div class="bg-[#212121] text-white shrink-0 relative z-60">
    <div class="flex items-center justify-between px-4 py-2">
      <h1 class="text-base font-semibold">{{ appConfig.name }}</h1>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="p-2 hover:bg-white/10 rounded flex items-center gap-2 group"
          :title="t('nav.search')"
          @click="openPalette"
        >
          <Search class="w-4 h-4" />
          <span
            class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-white/10 rounded border border-white/20 group-hover:border-white/30"
          >
            Ctrl+K
          </span>
        </button>
        <RouterLink
          v-if="canOpenSettings"
          :to="SETTINGS_PATH"
          class="p-2 hover:bg-white/10 rounded"
          :title="t('nav.settings')"
        >
          <Settings class="w-4 h-4" />
        </RouterLink>

        <div class="relative">
          <button
            type="button"
            class="p-2 hover:bg-white/10 rounded flex items-center gap-1 text-sm"
            :title="t('common.changeLanguage')"
            @click="toggleLang"
          >
            <Globe class="w-4 h-4" />
            <span class="uppercase text-xs font-medium">{{ locale }}</span>
          </button>
          <div
            v-if="isLangOpen"
            class="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg z-50 overflow-hidden"
          >
            <button
              v-for="language in SUPPORTED_LOCALES"
              :key="language.code"
              type="button"
              class="w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between"
              :class="
                locale === language.code
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              "
              @click="changeLocale(language.code)"
            >
              {{ language.label }}
              <span v-if="locale === language.code" class="text-primary">✓</span>
            </button>
          </div>
        </div>

        <div class="relative">
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-semibold text-sm ml-1 hover:opacity-80 transition-opacity"
            :title="userName"
            @click="toggleProfile"
          >
            {{ userInitial }}
          </button>
          <div
            v-if="isProfileOpen"
            class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 overflow-hidden"
          >
            <div class="px-4 py-3 border-b border-gray-200">
              <p class="text-sm font-semibold text-gray-900">{{ userName }}</p>
            </div>
            <button
              type="button"
              class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
              @click="onLogoutClick"
            >
              <LogOut class="w-4 h-4" />
              {{ t('auth.logout') }}
            </button>
          </div>
        </div>
        <div v-if="isProfileOpen || isLangOpen" class="fixed inset-0 z-40" @click="closeAll" />
      </div>
    </div>
    <ConfirmDialog
      :open="showLogoutConfirm"
      :title="t('auth.logoutConfirmTitle')"
      :message="t('auth.logoutConfirmMessage')"
      :confirm-label="t('auth.logout')"
      :cancel-label="t('common.cancel')"
      @confirm="onConfirmLogout"
      @cancel="showLogoutConfirm = false"
    />
  </div>
</template>
