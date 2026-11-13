<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'
import { redirectToListCard } from '@/composables/redirectToListCard'

redirectToListCard(useRoute(), useRouter(), '/fleet/medical-follow-ups')
</script>

<template>
  <div></div>
</template>
