<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'
import { redirectToListCard } from '@/composables/redirectToListCard'

redirectToListCard(useRoute(), useRouter(), '/hr/leave-types')
</script>

<template>
  <div></div>
</template>
