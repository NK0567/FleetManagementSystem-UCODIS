<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'
import { redirectToListCard } from '@/composables/redirectToListCard'

redirectToListCard(useRoute(), useRouter(), '/maintenance/mission-types')
</script>

<template>
  <div></div>
</template>
