<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <span
    class="text-destructive underline decoration-destructive underline-offset-2 cursor-help"
    :title="t('common.fieldRequired')"
  >
    *
  </span>
</template>
