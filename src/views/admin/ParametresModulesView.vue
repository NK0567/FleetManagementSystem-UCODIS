<template>
  <div :class="L.pageWrap">
    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Paramètres · Modules</div>
        <div :class="L.pageSub">Activation des fonctionnalités de la base commune FMS</div>
      </div>
    </div>
    <ParametresModulesContent />
  </div>
</template>

<script setup lang="ts">
import * as L from '../../lib/listClasses'
import ParametresModulesContent from '../../components/ParametresModulesContent.vue'
</script>
