<script lang="ts" setup>
import { computed, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePermissions } from '@/composables/usePermissions'
import { useUnsavedChangesRouteGuard } from '@/composables/useUnsavedChangesRouteGuard'
import { formatDateTime } from '@/utils/format'
import {
  MAINTENANCE_SETTING_FIELDS,
  MAINTENANCE_SETTINGS_SECTIONS,
  maintenanceSettingsIssues,
  type MaintenanceSettings,
  type MaintenanceSettingsSection
} from '../domain/maintenanceSettings'
import { useMaintenanceSettingsStore } from '../stores/maintenanceSettingsStore'

const { t } = useI18n()
const store = useMaintenanceSettingsStore()
const { canUpdate } = usePermissions('MAINTENANCESETTINGS')

const dirtySections = reactive(new Set<MaintenanceSettingsSection>())
useUnsavedChangesRouteGuard(computed(() => dirtySections.size > 0))

function setDirty(section: MaintenanceSettingsSection, dirty: boolean) {
  if (dirty) dirtySections.add(section)
  else dirtySections.delete(section)
}

function saveSection(section: MaintenanceSettingsSection) {
  return (values: Record<string, unknown>) =>
    store.saveSection(section, values as unknown as MaintenanceSettings[MaintenanceSettingsSection])
}

function validate(section: MaintenanceSettingsSection) {
  return (values: Record<string, unknown>) => maintenanceSettingsIssues(section, values)
}

function sectionValues(section: MaintenanceSettingsSection): Record<string, unknown> {
  return (store.settings?.[section] ?? {}) as unknown as Record<string, unknown>
}

onMounted(() => void store.fetchSettings())
</script>

<template>
  <div class="px-2 py-4 space-y-4 max-w-6xl">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">
        {{ t('maintenance.settings.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">{{ t('maintenance.settings.subtitle') }}</p>
      <p v-if="store.settings" class="text-xs text-muted-foreground mt-1">
        {{
          t('maintenance.settings.lastModified', {
            date: formatDateTime(store.settings.modifiedAt),
            user: store.settings.modifiedBy
          })
        }}
      </p>
    </header>

    <FormAlerts :error="store.saveError ?? store.error" @clear:error="store.saveError = null" />

    <LoadingSpinner v-if="store.loading" :text="t('common.loading')" />

    <template v-else-if="store.settings">
      <SettingsSectionCard
        v-for="section in MAINTENANCE_SETTINGS_SECTIONS"
        :key="section"
        label-prefix="maintenance.settings"
        :section="section"
        :fields="MAINTENANCE_SETTING_FIELDS[section]"
        :validate="validate(section)"
        :values="sectionValues(section)"
        :can-edit="canUpdate"
        :saving="store.savingSection === section"
        :save="saveSection(section)"
        @update:dirty="setDirty(section, $event)"
      />
    </template>
  </div>
</template>
