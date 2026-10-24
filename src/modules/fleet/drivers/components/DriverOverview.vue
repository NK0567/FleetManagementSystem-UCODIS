<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDate } from '@/utils/format'
import type { DriverApi } from '../types/driver.types'

defineProps<{ driver: DriverApi }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()
const expandedSections = ref({
  identity: true,
  assignment: true,
  score: true,
  documents: true,
  history: true
})
</script>

<template>
  <div class="px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.identity"
      :title="t('fleet.drivers.section.identity')"
      :summary="[driver.fullName, driver.jobPositionName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.drivers.col.fullName')">
          <FormInput :model-value="driver.fullName" disabled />
        </BaseFormField>
        <BaseFormField :label="t('fleet.drivers.col.jobPositionName')">
          <FormInput :model-value="driver.jobPositionName" disabled />
        </BaseFormField>
        <BaseFormField :label="t('fleet.drivers.col.phone')">
          <FormInput :model-value="driver.phone" disabled />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.drivers.col.siteName')">
          <FormInput :model-value="driver.siteName" disabled />
        </BaseFormField>
        <BaseFormField :label="t('fleet.drivers.col.employeeStatus')">
          <FormInput
            :model-value="optionsStore.getOptionLabel('employeeStatus', driver.employeeStatus)"
            disabled
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.drivers.col.drivingAuthorized')">
          <FormInput
            :model-value="driver.drivingAuthorized ? t('common.yes') : t('common.no')"
            disabled
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.assignment"
      :title="t('fleet.drivers.section.assignment')"
      :summary="[driver.vehiclePlate]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.drivers.col.vehiclePlate')">
          <FormInput :model-value="driver.vehiclePlate || t('fleet.drivers.noVehicle')" disabled />
        </BaseFormField>
        <BaseFormField :label="t('fleet.drivers.col.assignedSince')">
          <FormInput :model-value="formatDate(driver.assignedSince)" disabled />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.drivers.col.availability')">
          <DriverAvailabilityPill :availability="driver.availability" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.drivers.col.eligible')">
          <p class="text-sm" :class="driver.eligible ? 'text-card-foreground' : 'text-destructive'">
            {{ driver.eligible ? t('fleet.drivers.eligibleYes') : driver.ineligibilityReasons }}
          </p>
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.documents"
      :title="t('fleet.drivers.section.documents')"
      :summary="[driver.documentsCompliant ? '' : t('fleet.drivers.documentsNotCompliant')]"
    >
      <div class="xl:col-span-2 min-w-0">
        <SubjectDocumentsPanel
          target="person"
          :subject-no="driver.no"
          :gaps="driver.documentGaps"
        />
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.score"
      :title="t('fleet.drivers.section.score')"
      :summary="[`${driver.score}/100`]"
    >
      <DriverScorePanel :driver-no="driver.no" />
    </FormSection>

    <DriverActivitySections :driver-no="driver.no" />

    <FormSection
      v-model:open="expandedSections.history"
      :title="t('fleet.drivers.section.history')"
      :summary="[t('fleet.drivers.assignmentCount', driver.assignments.length)]"
    >
      <div class="xl:col-span-2 min-w-0">
        <p v-if="driver.assignments.length === 0" class="text-sm text-muted-foreground">
          {{ t('fleet.drivers.noAssignment') }}
        </p>
        <table v-else class="w-full text-sm border border-border rounded">
          <thead>
            <tr class="bg-muted/40 text-left text-xs text-muted-foreground">
              <th class="px-3 py-2 font-semibold">{{ t('fleet.drivers.col.vehiclePlate') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('fleet.drivers.history.start') }}</th>
              <th class="px-3 py-2 font-semibold">{{ t('fleet.drivers.history.end') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="assignment in driver.assignments"
              :key="assignment.no"
              class="border-t border-border"
            >
              <td class="px-3 py-1.5">{{ assignment.vehiclePlate }}</td>
              <td class="px-3 py-1.5">{{ formatDate(assignment.startDate) }}</td>
              <td class="px-3 py-1.5">
                {{
                  assignment.endDate
                    ? formatDate(assignment.endDate)
                    : t('fleet.drivers.history.running')
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </FormSection>
  </div>
</template>
