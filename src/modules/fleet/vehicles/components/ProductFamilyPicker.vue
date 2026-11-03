<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReferenceStore } from '@/stores/referenceStore'

/** Product families to keep a vehicle or a compartment for; none ticked means any family. */
const props = defineProps<{ disabled?: boolean }>()
const families = defineModel<string[]>({ required: true })

const { t } = useI18n()
const referenceStore = useReferenceStore()
const known = computed(() => referenceStore.getItems('productFamilies').map((item) => item.code))
const failed = computed(() => referenceStore.error)

/* A family already chosen stays listed even when no active product uses it any more. */
const shown = computed(() => [...new Set([...known.value, ...families.value])].sort())

onMounted(() => void referenceStore.fetchAll())

function toggle(family: string) {
  families.value = families.value.includes(family)
    ? families.value.filter((item) => item !== family)
    : [...families.value, family]
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <button
      v-for="family in shown"
      :key="family"
      type="button"
      class="cursor-pointer px-2 py-0.5 text-xs rounded-full border transition disabled:cursor-default"
      :class="
        families.includes(family)
          ? 'border-primary bg-primary/10 text-card-foreground'
          : 'border-border text-muted-foreground hover:bg-accent'
      "
      :aria-pressed="families.includes(family)"
      :disabled="props.disabled"
      @click="toggle(family)"
    >
      {{ family }}
    </button>
    <span class="text-xs text-muted-foreground">
      {{
        failed
          ? t('fleet.vehicles.families.loadError')
          : families.length
            ? ''
            : t('fleet.vehicles.families.any')
      }}
    </span>
  </div>
</template>
