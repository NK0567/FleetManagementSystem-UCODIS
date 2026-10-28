<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PenLine, Plus } from '@lucide/vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { equipmentTypeService, type EquipmentTypeApi } from '@/modules/fleet/equipment-types'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDate } from '@/utils/format'
import { vehicleService } from '../services/vehicleService'
import type { EquipmentDueState, EquipmentState, VehicleEquipmentApi } from '../types/vehicle.types'

const props = defineProps<{ vehicleNo: string; editable: boolean }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()

const items = ref<VehicleEquipmentApi[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const showUninstalled = ref(false)

const shown = computed(() =>
  items.value.filter((item) => showUninstalled.value || item.state !== 'uninstalled')
)

const DUE_TONES: Record<EquipmentDueState, StatusTone> = {
  ok: 'success',
  due_soon: 'warning',
  overdue: 'danger'
}
const STATE_TONES: Record<EquipmentState, StatusTone> = {
  operational: 'success',
  out_of_service: 'danger',
  uninstalled: 'neutral'
}

async function load() {
  loading.value = true
  error.value = null
  try {
    items.value = await vehicleService.getEquipment(props.vehicleNo)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.vehicles.equipment.loadError'))
  } finally {
    loading.value = false
  }
}

/** One dialog adds an item or edits an existing one. */
const editing = ref<VehicleEquipmentApi | null>(null)
const showDialog = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)
const draft = ref({
  equipmentTypeNo: '',
  serialNumber: '',
  dueDate: null as string | null,
  installedOn: null as string | null,
  state: 'operational' as EquipmentState
})
const draftType = ref<EquipmentTypeApi | null>(null)

watch(
  () => draft.value.equipmentTypeNo,
  async (code) => {
    draftType.value = code ? await equipmentTypeService.getById(code).catch(() => null) : null
  }
)

const needsDueDate = computed(() => !!draftType.value?.hasDueDate)
const canSave = computed(
  () => !!draft.value.equipmentTypeNo && (!needsDueDate.value || !!draft.value.dueDate)
)

function openAdd() {
  editing.value = null
  draft.value = {
    equipmentTypeNo: '',
    serialNumber: '',
    dueDate: null,
    installedOn: null,
    state: 'operational'
  }
  saveError.value = null
  showDialog.value = true
}

function openEdit(item: VehicleEquipmentApi) {
  editing.value = item
  draft.value = {
    equipmentTypeNo: item.equipmentTypeNo,
    serialNumber: item.serialNumber,
    dueDate: item.dueDate,
    installedOn: item.installedOn,
    state: item.state
  }
  saveError.value = null
  showDialog.value = true
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  saveError.value = null
  try {
    if (editing.value) {
      await vehicleService.updateEquipment(props.vehicleNo, editing.value.no, {
        serialNumber: draft.value.serialNumber,
        dueDate: draft.value.dueDate,
        state: draft.value.state
      })
    } else {
      await vehicleService.addEquipment(props.vehicleNo, { ...draft.value })
    }
    showDialog.value = false
    await load()
  } catch (cause) {
    saveError.value = apiErrorMessage(cause, t('fleet.vehicles.equipment.saveError'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
watch(() => props.vehicleNo, load)
</script>

<template>
  <div class="space-y-2">
    <FormAlerts :error="error" @clear:error="error = null" />
    <div class="flex items-center justify-between gap-2">
      <label class="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ToggleSwitch v-model="showUninstalled" />
        {{ t('fleet.vehicles.equipment.showUninstalled') }}
      </label>
      <button
        v-if="editable"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition"
        @click="openAdd"
      >
        <Plus class="w-4 h-4" /> {{ t('fleet.vehicles.equipment.add') }}
      </button>
    </div>
    <LoadingSpinner v-if="loading" :text="t('common.loading')" />
    <p v-else-if="shown.length === 0" class="text-sm text-muted-foreground">
      {{ t('fleet.vehicles.equipment.empty') }}
    </p>
    <div v-else class="overflow-x-auto border border-border rounded">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted/40 text-left text-xs text-muted-foreground">
            <th class="px-3 py-2 font-semibold">{{ t('fleet.vehicles.equipment.type') }}</th>
            <th class="px-3 py-2 font-semibold">
              {{ t('fleet.vehicles.equipment.serialNumber') }}
            </th>
            <th class="px-3 py-2 font-semibold">{{ t('fleet.vehicles.equipment.state') }}</th>
            <th class="px-3 py-2 font-semibold">{{ t('fleet.vehicles.equipment.dueDate') }}</th>
            <th class="px-3 py-2 font-semibold">{{ t('fleet.vehicles.equipment.installedOn') }}</th>
            <th v-if="editable" class="w-10"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in shown" :key="item.no" class="border-t border-border">
            <td class="px-3 py-2">{{ item.equipmentTypeName }}</td>
            <td class="px-3 py-2">{{ item.serialNumber || '—' }}</td>
            <td class="px-3 py-2">
              <StatusPill
                :label="optionsStore.getOptionLabel('equipmentState', item.state)"
                :tone="STATE_TONES[item.state]"
              />
            </td>
            <td class="px-3 py-2">
              <span v-if="!item.dueDate">—</span>
              <StatusPill
                v-else-if="item.dueState"
                :label="formatDate(item.dueDate)"
                :tone="DUE_TONES[item.dueState]"
              />
              <span v-else>{{ formatDate(item.dueDate) }}</span>
            </td>
            <td class="px-3 py-2">{{ formatDate(item.installedOn) }}</td>
            <td v-if="editable" class="px-2 py-2 text-right">
              <button
                type="button"
                class="p-1.5 rounded hover:bg-accent"
                :aria-label="t('common.edit')"
                :title="t('common.edit')"
                @click="openEdit(item)"
              >
                <PenLine class="w-4 h-4 text-primary" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmDialog
      :open="showDialog"
      :title="editing ? t('fleet.vehicles.equipment.edit') : t('fleet.vehicles.equipment.add')"
      :confirm-label="t('common.save')"
      :confirm-disabled="!canSave"
      :loading="saving"
      panel-class="max-w-lg"
      @confirm="save"
      @cancel="showDialog = false"
    >
      <div class="space-y-3">
        <FormAlerts :error="saveError" @clear:error="saveError = null" />
        <BaseFormField :label="t('fleet.vehicles.equipment.type')" required>
          <ReferenceLookup
            v-model="draft.equipmentTypeNo"
            reference-key="equipmentTypes"
            :modal-title="t('fleet.vehicles.equipment.type')"
            :disabled="!!editing"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicles.equipment.serialNumber')">
          <FormInput v-model="draft.serialNumber" :maxlength="40" />
        </BaseFormField>
        <BaseFormField
          v-if="needsDueDate || draft.dueDate"
          :label="t('fleet.vehicles.equipment.dueDate')"
          :required="needsDueDate"
        >
          <DateFormInput v-model="draft.dueDate" />
        </BaseFormField>
        <BaseFormField v-if="!editing" :label="t('fleet.vehicles.equipment.installedOn')">
          <DateFormInput v-model="draft.installedOn" />
        </BaseFormField>
        <BaseFormField v-else :label="t('fleet.vehicles.equipment.state')">
          <OptionsSelect
            :model-value="draft.state"
            options-key="equipmentState"
            @update:model-value="draft.state = String($event) as EquipmentState"
          />
        </BaseFormField>
      </div>
    </ConfirmDialog>
  </div>
</template>
