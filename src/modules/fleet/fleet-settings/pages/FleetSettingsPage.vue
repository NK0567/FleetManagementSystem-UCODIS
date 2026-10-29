<script lang="ts" setup>
import { computed, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePermissions } from '@/composables/usePermissions'
import { useUnsavedChangesRouteGuard } from '@/composables/useUnsavedChangesRouteGuard'
import { formatDateTime } from '@/utils/format'
import {
  FLEET_SETTING_FIELDS,
  FLEET_SETTINGS_SECTIONS,
  settingsSectionIssues,
  type FleetSettings,
  type FleetSettingsSection
} from '../domain/fleetSettings'
import { useFleetSettingsStore } from '../stores/fleetSettingsStore'
import ImportMappingsPanel from '../components/ImportMappingsPanel.vue'
import IndicatorsPanel from '../components/IndicatorsPanel.vue'
import ScoreFamiliesPanel from '../components/ScoreFamiliesPanel.vue'
import type { IndicatorSetting } from '../domain/indicators'

const { t } = useI18n()
const store = useFleetSettingsStore()
const { canUpdate } = usePermissions('FLEETSETTINGS')

const dirtySections = reactive(new Set<FleetSettingsSection>())
/** The lists of the settings (score families, imports, indicators) are saved on their own. */
const dirtyLists = reactive(new Set<string>())
useUnsavedChangesRouteGuard(computed(() => dirtySections.size > 0 || dirtyLists.size > 0))

function setListDirty(list: string, dirty: boolean) {
  if (dirty) dirtyLists.add(list)
  else dirtyLists.delete(list)
}

/** The availability target is shared with the reporting section: both show the saved value. */
function onIndicatorsSaved(indicators: IndicatorSetting[]) {
  if (!store.settings) return
  store.settings.indicators = indicators
  const availability = indicators.find((item) => item.key === 'availabilityRate')
  if (availability?.target != null && store.settings.reporting) {
    store.settings.reporting = {
      ...store.settings.reporting,
      availabilityTargetPct: availability.target
    }
  }
}

function setDirty(section: FleetSettingsSection, dirty: boolean) {
  if (dirty) dirtySections.add(section)
  else dirtySections.delete(section)
}

function saveSection(section: FleetSettingsSection) {
  return (values: Record<string, unknown>) =>
    store.saveSection(section, values as unknown as FleetSettings[FleetSettingsSection])
}

function validate(section: FleetSettingsSection) {
  return (values: Record<string, unknown>) =>
    settingsSectionIssues(section, values as unknown as FleetSettings[FleetSettingsSection])
}

function sectionValues(section: FleetSettingsSection): Record<string, unknown> {
  return (store.settings?.[section] ?? {}) as unknown as Record<string, unknown>
}

onMounted(() => void store.fetchSettings())
</script>

<template>
  <div class="px-2 py-4 space-y-4 max-w-6xl">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">{{ t('fleet.settings.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('fleet.settings.subtitle') }}</p>
      <p v-if="store.settings" class="text-xs text-muted-foreground mt-1">
        {{
          t('fleet.settings.lastModified', {
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
        v-for="section in FLEET_SETTINGS_SECTIONS"
        :key="section"
        label-prefix="fleet.settings"
        :section="section"
        :fields="FLEET_SETTING_FIELDS[section]"
        :validate="validate(section)"
        :values="sectionValues(section)"
        :can-edit="canUpdate"
        :saving="store.savingSection === section"
        :save="saveSection(section)"
        @update:dirty="setDirty(section, $event)"
      />
      <div class="border border-border rounded">
        <ScoreFamiliesPanel
          :families="store.settings.scoreFamilies"
          :can-edit="canUpdate"
          @saved="store.settings.scoreFamilies = $event"
          @update:dirty="setListDirty('scoreFamilies', $event)"
        />
        <ImportMappingsPanel
          :mappings="store.settings.importMappings"
          :can-edit="canUpdate"
          @saved="(kind, mapping) => (store.settings!.importMappings[kind] = mapping)"
          @update:dirty="setListDirty('importMappings', $event)"
        />
        <IndicatorsPanel
          :indicators="store.settings.indicators"
          :can-edit="canUpdate"
          @saved="onIndicatorsSaved"
          @update:dirty="setListDirty('indicators', $event)"
        />
      </div>
    </template>
  </div>
</template>
