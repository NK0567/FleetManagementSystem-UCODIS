<template>
  <div :class="L.pageWrap">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Fonctions</div>
        <div :class="L.pageSub">
          Les postes définis par la procédure UCD-TRUCK-FLOT-001, avec leurs responsabilités
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2.5">
      <div
        v-for="f in fonctions.liste" :key="f.id"
        class="bg-card border border-border rounded-lg overflow-hidden"
      >
        <button
          class="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left hover:bg-background transition-colors"
          @click="basculer(f.id)"
        >
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            :class="f.conduit ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground'"
          >
            <IdCard v-if="f.conduit" class="w-[18px] h-[18px]" />
            <Briefcase v-else class="w-[18px] h-[18px]" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[14px] font-semibold text-foreground">{{ f.libelle }}</span>
              <span class="text-[10px] font-mono bg-background text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                {{ f.code }}
              </span>
              <span v-if="f.conduit" class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                Permis et habilitation requis
              </span>
            </div>
            <div class="text-[12px] text-muted-foreground mt-0.5">
              {{ entiteNom(f.entiteId) }} · {{ effectifReel(f.id) }} personne(s) ·
              {{ f.responsabilites.length }} responsabilité(s)
            </div>
          </div>

          <ChevronDown class="w-4 h-4 text-muted-foreground shrink-0 transition-transform"
                       :class="ouvertes.has(f.id) && 'rotate-180'" />
        </button>

        <div v-if="ouvertes.has(f.id)" class="border-t border-border bg-background px-4 py-3.5">
          <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2">
            Responsabilités
          </div>
          <ul class="flex flex-col gap-1.5 mb-4">
            <li v-for="(r, i) in f.responsabilites" :key="i" class="flex gap-2 text-[13px] leading-snug">
              <span class="text-primary shrink-0">•</span><span>{{ r }}</span>
            </li>
          </ul>

          <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-2">
            Personnes sur cette fonction
          </div>
          <div v-if="titulaires(f.id).length" class="flex flex-wrap gap-1.5">
            <RouterLink
              v-for="p in titulaires(f.id)" :key="p.id"
              :to="{ name: 'admin-personnel-detail', params: { id: p.id } }"
              class="flex items-center gap-1.5 bg-card border border-border rounded-full pl-1 pr-2.5 py-1 no-underline text-foreground hover:border-primary/40"
            >
              <UserAvatar :nom="p.nomComplet" taille="sm" />
              <span class="text-[12px]">{{ p.nomComplet }}</span>
            </RouterLink>
          </div>
          <p v-else class="text-[12px] text-muted-foreground">Aucune personne rattachée.</p>
        </div>
      </div>
    </div>

    <p class="text-[11px] text-muted-foreground mt-4 leading-relaxed max-w-3xl">
      Deux fonctions ne relèvent pas de l'exploitation, Direction et Administrateur système,
      parce qu'elles servent au pilotage et à l'exploitation du logiciel ; elles sont signalées
      comme telles dans leur fiche.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Briefcase, ChevronDown, IdCard } from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import * as L from '../../lib/listClasses'
import { useFonctionStore } from '../../stores/fonctions'
import { usePersonnelStore } from '../../stores/personnel'
import { useEntiteStore } from '../../stores/entites'

const fonctions = useFonctionStore()
const personnel = usePersonnelStore()
const entites = useEntiteStore()

const ouvertes = ref(new Set<string>(['f-cond']))

function basculer(id: string) {
  const s = new Set(ouvertes.value)
  s.has(id) ? s.delete(id) : s.add(id)
  ouvertes.value = s
}

function titulaires(fonctionId: string) {
  return personnel.actifs.filter(p => p.fonctionId === fonctionId)
}

function effectifReel(fonctionId: string) {
  return titulaires(fonctionId).length
}

function entiteNom(id: string) {
  return entites.parId(id)?.nom ?? '-'
}
</script>
