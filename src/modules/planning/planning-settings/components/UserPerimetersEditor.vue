<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PenLine } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { useOptionsStore } from '@/stores/optionsStore'
import { perimeterApi, type PerimeterOptionsApi, type UserPerimeterApi } from '../api/perimeterApi'

/**
 * Each user tied to depots and regions (TRS07-US02): he then sees only the transport orders and
 * the orders that depend on them. A user tied to nothing sees everything.
 */
defineProps<{ canEdit: boolean }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()
const users = ref<UserPerimeterApi[]>([])
const options = ref<PerimeterOptionsApi>({ depots: [], regions: [] })
const loading = ref(false)
const error = ref<string | null>(null)
const editing = ref<UserPerimeterApi | null>(null)
const depotNos = ref<string[]>([])
const regions = ref<string[]>([])
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const data = (await perimeterApi.list()).data.data
    users.value = data.users
    options.value = data.options
    error.value = null
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.settings.loadError'))
  } finally {
    loading.value = false
  }
}

function open(user: UserPerimeterApi) {
  editing.value = user
  depotNos.value = [...user.depotNos]
  regions.value = [...user.regions]
}

async function save() {
  const user = editing.value
  if (!user) return
  saving.value = true
  try {
    await perimeterApi.update(user.code, { depotNos: depotNos.value, regions: regions.value })
    editing.value = null
    await load()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.settings.saveError'))
  } finally {
    saving.value = false
  }
}

const depotName = (no: string) => options.value.depots.find((depot) => depot.no === no)?.name ?? no

onMounted(load)
</script>

<template>
  <section class="bg-card border border-border rounded">
    <header class="px-4 py-3 border-b border-border">
      <h2 class="text-base font-semibold text-card-foreground">
        {{ t('planning.settings.perimeters.title') }}
      </h2>
      <p class="text-xs text-muted-foreground">{{ t('planning.settings.perimeters.hint') }}</p>
    </header>
    <FormAlerts class="mx-4 mt-3" :error="error" @clear:error="error = null" />
    <LoadingSpinner v-if="loading" class="m-4" :size="16" />
    <div v-else class="overflow-x-auto px-4 py-4">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted/40 text-xs text-muted-foreground">
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.settings.perimeters.user') }}
            </th>
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.settings.perimeters.depots') }}
            </th>
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.settings.perimeters.regions') }}
            </th>
            <th v-if="canEdit" class="w-24" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.code" class="border-t border-border">
            <td class="px-3 py-2">
              <p class="text-card-foreground">{{ user.name }}</p>
              <p class="text-xs text-muted-foreground">
                {{ user.code }} · {{ optionsStore.getOptionLabel('userProfile', user.profile) }}
              </p>
            </td>
            <td class="px-3 py-2">
              {{ user.depotNos.map(depotName).join(', ') || t('planning.settings.perimeters.all') }}
            </td>
            <td class="px-3 py-2">
              {{ user.regions.join(', ') || t('planning.settings.perimeters.all') }}
            </td>
            <td v-if="canEdit" class="px-3 py-2 text-right">
              <button
                type="button"
                class="cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-accent"
                @click="open(user)"
              >
                <PenLine class="w-3.5 h-3.5" /> {{ t('common.edit') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <ConfirmDialog
    :open="!!editing"
    :title="t('planning.settings.perimeters.editTitle', { name: editing?.name ?? '' })"
    :confirm-label="t('common.save')"
    :loading="saving"
    panel-class="max-w-lg"
    @confirm="save"
    @cancel="editing = null"
  >
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
      <fieldset>
        <legend class="font-semibold text-card-foreground mb-1">
          {{ t('planning.settings.perimeters.depots') }}
        </legend>
        <label
          v-for="depot in options.depots"
          :key="depot.no"
          class="flex items-start gap-2 py-0.5 cursor-pointer"
        >
          <input
            v-model="depotNos"
            type="checkbox"
            class="h-4 w-4 mt-0.5 accent-primary"
            :value="depot.no"
          />
          <span>
            {{ depot.name }}
            <span v-if="depot.ownerName" class="block text-xs text-muted-foreground">
              {{ t('planning.settings.perimeters.owner', { owner: depot.ownerName }) }}
            </span>
          </span>
        </label>
      </fieldset>
      <fieldset>
        <legend class="font-semibold text-card-foreground mb-1">
          {{ t('planning.settings.perimeters.regions') }}
        </legend>
        <label
          v-for="region in options.regions"
          :key="region"
          class="flex items-center gap-2 py-0.5 cursor-pointer"
        >
          <input v-model="regions" type="checkbox" class="h-4 w-4 accent-primary" :value="region" />
          {{ region }}
        </label>
      </fieldset>
    </div>
    <p class="text-xs text-muted-foreground mt-3">
      {{ t('planning.settings.perimeters.noneHint') }}
    </p>
  </ConfirmDialog>
</template>
