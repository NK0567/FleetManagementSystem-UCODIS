<template>
  <div :class="L.pageWrap">
    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Paramètres · Modules</div>
        <div :class="L.pageSub">Activation des modules et réglages du transport</div>
      </div>
    </div>
    <ParametresModulesContent />
    <ParametresPlanification />
  </div>
</template>

<script setup lang="ts">
import * as L from '../../lib/listClasses'
import ParametresModulesContent from '../../components/ParametresModulesContent.vue'
import ParametresPlanification from '../../components/ParametresPlanification.vue'
</script>
