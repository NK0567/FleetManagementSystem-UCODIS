<template>
  <div :class="L.pageWrap">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Services</div>
        <div :class="L.pageSub">
          Structure d'UCODIS Transport · {{ entites.liste.length }} entités
        </div>
      </div>
      <button v-if="auth.estAdmin" :class="L.btnPrimary"><Plus class="w-4 h-4" /> Créer un service</button>
    </div>

    <div class="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
      <div
        v-for="e in entites.liste" :key="e.id"
        class="bg-card border border-border rounded-lg p-4 transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
        :class="e.type === 'direction' && 'col-span-2 max-lg:col-span-1 border-primary/25'"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            :class="e.type === 'direction' ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground'"
          >
            <Landmark v-if="e.type === 'direction'" class="w-5 h-5" />
            <Users v-else-if="e.type === 'equipe'" class="w-5 h-5" />
            <Building v-else class="w-5 h-5" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[15px] font-semibold text-foreground">{{ e.nom }}</span>
              <span class="text-[10px] font-mono bg-background text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                {{ e.code }}
              </span>
            </div>
            <p class="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">{{ e.description }}</p>

            <div class="flex items-center gap-4 mt-3 flex-wrap">
              <div class="flex items-center gap-1.5 text-[12px]">
                <UserAvatar v-if="e.responsableNom" :nom="e.responsableNom" taille="sm" />
                <span class="text-muted-foreground">{{ e.responsableNom || 'Sans responsable' }}</span>
              </div>
              <div class="flex items-center gap-1 text-[12px] text-muted-foreground">
                <Users class="w-3.5 h-3.5" /> {{ e.effectif }} personne(s)
              </div>
              <div class="flex items-center gap-1 text-[12px] text-muted-foreground">
                <MapPin class="w-3.5 h-3.5" /> {{ e.site }}
              </div>
            </div>
          </div>
        </div>

        <!-- Personnes rattachées -->
        <div v-if="membres(e.id).length" class="flex items-center gap-1 mt-3.5 pt-3 border-t border-border flex-wrap">
          <RouterLink
            v-for="m in membres(e.id).slice(0, 12)" :key="m.id"
            :to="{ name: 'admin-personnel-detail', params: { id: m.id } }"
            :title="`${m.nomComplet} · ${m.fonctionLibelle}`"
          >
            <UserAvatar :nom="m.nomComplet" taille="sm" />
          </RouterLink>
          <span v-if="membres(e.id).length > 12" class="text-[11px] text-muted-foreground ml-1">
            +{{ membres(e.id).length - 12 }}
          </span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Building, Landmark, MapPin, Plus, Users } from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import * as L from '../../lib/listClasses'
import { useAuthStore } from '../../stores/auth'
import { useEntiteStore } from '../../stores/entites'
import { usePersonnelStore } from '../../stores/personnel'

const auth = useAuthStore()
const entites = useEntiteStore()
const personnel = usePersonnelStore()

function membres(entiteId: string) {
  return personnel.parEntite(entiteId)
}
</script>
