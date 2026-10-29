<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePermissions } from '@/composables/usePermissions'
import { useUnsavedChangesRouteGuard } from '@/composables/useUnsavedChangesRouteGuard'
import { formatDateTime } from '@/utils/format'
import {
  PLANNING_SETTING_FIELDS,
  PLANNING_SETTINGS_SECTIONS,
  planningSettingsIssues,
  type PlanningSettings,
  type PlanningSettingsSection
} from '../domain/planningSettings'
import { usePlanningSettingsStore } from '../stores/planningSettingsStore'
import IncidentListsEditor from '../components/IncidentListsEditor.vue'
import UserPerimetersEditor from '../components/UserPerimetersEditor.vue'

const { t } = useI18n()
const store = usePlanningSettingsStore()
const { canUpdate } = usePermissions('PLANNINGSETTINGS')

const dirtySections = reactive(new Set<PlanningSettingsSection>())
const incidentsDirty = ref(false)
useUnsavedChangesRouteGuard(computed(() => dirtySections.size > 0 || incidentsDirty.value))

function setDirty(section: PlanningSettingsSection, dirty: boolean) {
  if (dirty) dirtySections.add(section)
  else dirtySections.delete(section)
}

function saveSection(section: PlanningSettingsSection) {
  return (values: Record<string, unknown>) =>
    store.saveSection(section, values as unknown as PlanningSettings[PlanningSettingsSection])
}

function validate(section: PlanningSettingsSection) {
  return (values: Record<string, unknown>) => planningSettingsIssues(section, values)
}

function sectionValues(section: PlanningSettingsSection): Record<string, unknown> {
  return (store.settings?.[section] ?? {}) as unknown as Record<string, unknown>
}

onMounted(() => void store.fetchSettings())
</script>

<template>
  <div class="px-2 py-4 space-y-4 max-w-6xl">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">
        {{ t('planning.settings.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.settings.subtitle') }}</p>
      <p v-if="store.settings" class="text-xs text-muted-foreground mt-1">
        {{
          t('planning.settings.lastModified', {
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
        v-for="section in PLANNING_SETTINGS_SECTIONS"
        :key="section"
        label-prefix="planning.settings"
        :section="section"
        :fields="PLANNING_SETTING_FIELDS[section]"
        :validate="validate(section)"
        :values="sectionValues(section)"
        :can-edit="canUpdate"
        :saving="store.savingSection === section"
        :save="saveSection(section)"
        @update:dirty="setDirty(section, $event)"
      />
      <IncidentListsEditor
        :lists="store.settings.incidents"
        :can-edit="canUpdate"
        :saving="store.savingIncidents"
        :save="store.saveIncidents"
        @update:dirty="incidentsDirty = $event"
      />
      <UserPerimetersEditor :can-edit="canUpdate" />
    </template>
  </div>
</template>
