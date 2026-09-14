<template>
  <div class="bg-nav h-12 px-5 border-b border-black/10 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center shrink-0">

    <div class="flex items-center shrink-0">
      <img :src="logo" class="h-6 w-auto object-contain" alt="HV" />
      <div :class="[separateur, 'hidden sm:block']"></div>
      <span class="hidden sm:block text-[15px] font-bold text-foreground tracking-[0.04em] whitespace-nowrap">
        HV
      </span>
    </div>

    <!--
      Un onglet par module construit. On n'affiche jamais un onglet qui ne
      mène nulle part : les modules non encore bâtis n'apparaissent pas ici.
    -->
    <div class="ml-auto hidden md:flex" v-if="auth.cotéGestion">
      <div
        v-for="item in ongletsModules" :key="item.cle"
        :class="[ongletClass, nav.moduleActif === item.cle && ongletActif]"
        @click="aller(item)"
      >{{ item.libelle }}</div>
    </div>

    <div class="flex items-center ml-auto md:ml-0">
      <div :class="[separateur, 'hidden md:block']"></div>
      <span class="hidden md:block text-[11px] font-semibold text-primary tracking-[0.04em] whitespace-nowrap">
        {{ contexte }}
      </span>
    </div>

    <button
      v-if="auth.cotéGestion"
      class="w-8 h-8 rounded-md items-center justify-center cursor-pointer text-muted-foreground transition-colors hover:bg-background flex md:hidden ml-2"
      @click="menuMobile = !menuMobile"
    >
      <X v-if="menuMobile" class="w-5 h-5" /><Menu v-else class="w-5 h-5" />
    </button>
  </div>

  <div v-if="menuMobile" class="fixed inset-0 bg-black/30 z-[140] md:hidden" @click="menuMobile = false"></div>
  <div v-if="menuMobile" class="fixed top-[92px] inset-x-0 bg-card border-b border-border shadow-lg z-[150] py-2 md:hidden">
    <div
      v-for="item in ongletsModules" :key="item.cle"
      class="flex items-center px-5 py-3 text-sm font-medium text-foreground/80 cursor-pointer border-b border-border last:border-0 hover:bg-background hover:text-primary"
      @click="aller(item); menuMobile = false"
    >{{ item.libelle }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Menu, X } from '@lucide/vue'
import logo from '../assets/logo-ucodis.png'
import { useAuthStore } from '../stores/auth'
import { useNavigationStore } from '../stores/navigation'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const nav = useNavigationStore()

const separateur = 'w-px h-5 bg-black/10 mx-3.5 shrink-0'
const ongletClass =
  'h-12 px-3.5 flex items-center text-sm font-medium text-muted-foreground border-b-[3px] border-transparent cursor-pointer whitespace-nowrap transition-all select-none hover:text-foreground hover:bg-black/[0.03]'
const ongletActif = 'text-primary !border-primary font-semibold'

interface OngletModule { cle: string; libelle: string; route: string }

/** Un onglet par module réellement construit · ajouté ici au fur et à mesure. */
const ongletsModules = computed<OngletModule[]>(() => [
  { cle: 'administration', libelle: 'Personnel', route: 'admin-tableau-bord' },
  { cle: 'flotte', libelle: 'Flotte', route: 'flotte-tableau-bord' },
  { cle: 'maintenance', libelle: 'Maintenance', route: 'maintenance-dashboard' },
])

function aller(item: OngletModule) {
  nav.setModule(item.cle)
  router.push({ name: item.route })
}

const contexte = computed(() => `${auth.libelleRole.toUpperCase()} · UCODIS`)

const menuMobile = ref(false)

/**
 * Détermine le module actif à partir de l'adresse courante. Cette fonction
 * doit connaître tous les préfixes de module : un préfixe oublié renvoie
 * « administration » et écrase le module qu'on vient de choisir.
 */
function detecterModule(chemin: string): string {
  if (chemin.startsWith('/maintenance')) return 'maintenance'
  if (chemin.startsWith('/flotte')) return 'flotte'
  return 'administration'
}

watch(() => route.path, p => nav.setModule(detecterModule(p)), { immediate: true })
</script>
