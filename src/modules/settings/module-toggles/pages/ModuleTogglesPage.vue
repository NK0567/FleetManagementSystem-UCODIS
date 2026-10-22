<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RotateCcw } from '@lucide/vue'
import { usePermissions } from '@/composables/usePermissions'
import { appConfig } from '@/core/app/appConfig'
import { demoApi } from '@/core/api/demoApi'
import { useModuleToggleStore } from '../stores/moduleToggleStore'
import type { ModuleToggleApi, ModuleToggleGroup } from '../types/moduleToggle.types'

const GROUPS: ModuleToggleGroup[] = ['fleet', 'maintenance']

const { t } = useI18n()
const store = useModuleToggleStore()
const { canUpdate } = usePermissions('MODULETOGGLE')

const showResetConfirm = ref(false)
const resetting = ref(false)

const groups = computed(() =>
  GROUPS.map((group) => ({
    group,
    toggles: store.items.filter((toggle: ModuleToggleApi) => toggle.group === group)
  })).filter(({ toggles }) => toggles.length > 0)
)

async function resetDemoData() {
  resetting.value = true
  try {
    await demoApi.resetData()
    window.location.reload()
  } finally {
    resetting.value = false
  }
}

onMounted(() => {
  void store.fetchAll()
})
</script>

<template>
  <div class="px-2 py-4 space-y-6 max-w-4xl">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-card-foreground">
          {{ t('settings.moduleToggles.title') }}
        </h1>
        <p class="text-sm text-muted-foreground">{{ t('settings.moduleToggles.subtitle') }}</p>
      </div>
      <button
        v-if="appConfig.useMockApi && canUpdate"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition"
        @click="showResetConfirm = true"
      >
        <RotateCcw class="w-4 h-4" />
        {{ t('settings.moduleToggles.resetDemo') }}
      </button>
    </header>

    <FormAlerts :error="store.saveError ?? store.error" />

    <LoadingSpinner v-if="store.loading" :text="t('common.loading')" />

    <section v-for="{ group, toggles } in groups" v-else :key="group" class="space-y-2">
      <h2 class="text-sm font-semibold text-muted-foreground uppercase">
        {{ t(`settings.moduleToggles.group.${group}`) }}
      </h2>
      <div
        v-for="toggle in toggles"
        :key="toggle.no"
        class="bg-card border border-border rounded px-4 py-3 flex items-start gap-4"
      >
        <ToggleSwitch
          :model-value="toggle.active"
          :disabled="!canUpdate || store.savingNo === toggle.no"
          @update:model-value="(active) => store.setActive(toggle.no, active)"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-semibold text-card-foreground">
              {{ t(`settings.moduleToggles.item.${toggle.no}.label`) }}
            </span>
            <StatusPill
              :tone="toggle.active ? 'success' : 'neutral'"
              :label="
                toggle.active
                  ? t('settings.moduleToggles.active')
                  : t('settings.moduleToggles.inactive')
              "
            />
          </div>
          <p class="text-sm text-muted-foreground mt-1">
            {{ t(`settings.moduleToggles.item.${toggle.no}.description`) }}
          </p>
        </div>
      </div>
    </section>

    <ConfirmDialog
      :open="showResetConfirm"
      :title="t('settings.moduleToggles.resetDemo')"
      :message="t('settings.moduleToggles.resetDemoConfirm')"
      :confirm-label="t('settings.moduleToggles.resetDemo')"
      :loading="resetting"
      destructive
      @confirm="resetDemoData"
      @cancel="showResetConfirm = false"
    />
  </div>
</template>
