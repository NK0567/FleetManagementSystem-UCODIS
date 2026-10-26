<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'
import { redirectToListCard } from '@/composables/redirectToListCard'

redirectToListCard(useRoute(), useRouter(), '/planning/delivery-points')
</script>

<template>
  <div></div>
</template>
