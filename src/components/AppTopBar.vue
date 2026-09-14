<template>
  <div class="bg-header text-header-foreground h-11 px-5 flex items-center justify-between shrink-0 relative z-60">

    <div class="flex items-center gap-2.5 min-w-0">
      <span class="text-[15px] font-semibold whitespace-nowrap">FMS Trucks</span>
      <span class="hidden sm:block text-[11px] text-white/45 tracking-[0.08em] uppercase">Fleet Management System</span>
    </div>

    <div class="flex items-center gap-1.5">

      <!-- Notifications -->
      <div v-if="auth.cotéGestion" :class="iconBtn" title="Notifications" @click.stop="basculer('notif')">
        <Bell class="w-4 h-4" />
        <span
          v-if="notifs.nonLues > 0"
          class="absolute -top-0.5 -right-0.5 bg-primary text-white text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold"
        >{{ notifs.nonLues }}</span>

        <div v-if="ouvert === 'notif'" :class="[dropdown, 'w-[330px] p-0']" @click.stop>
          <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-border">
            <span class="text-xs font-bold text-foreground">Alertes</span>
            <button
              v-if="notifs.nonLues > 0"
              class="text-[11px] text-primary cursor-pointer"
              @click="notifs.toutMarquerLu()"
            >Tout marquer lu</button>
          </div>
          <div class="max-h-80 overflow-y-auto">
            <div
              v-for="n in notifs.liste.slice(0, 12)" :key="n.id"
              class="flex gap-2.5 px-3.5 py-2.5 border-b border-border last:border-0 cursor-pointer hover:bg-background"
              :class="{ 'bg-primary/5': !n.lu }"
              @click="notifs.marquerLu(n.id)"
            >
              <span class="w-2 h-2 rounded-full shrink-0 mt-1.5" :class="POINT[n.type]"></span>
              <div class="min-w-0">
                <div class="text-xs font-semibold text-foreground">{{ n.titre }}</div>
                <div class="text-[11px] text-muted-foreground mt-0.5">{{ n.message }}</div>
              </div>
            </div>
            <div v-if="notifs.liste.length === 0" class="p-6 text-center text-xs text-muted-foreground">
              Aucune alerte en cours
            </div>
          </div>
        </div>
      </div>

      <!-- Paramètres : superposition indépendante de la page courante, jamais une navigation. -->
      <div v-if="auth.cotéGestion" :class="iconBtn" title="Paramètres" @click.stop="parametresOuverts = true">
        <Settings class="w-4 h-4" />
      </div>

      <!-- Compte -->
      <div :class="[iconBtn, 'w-auto px-1.5 gap-2']" @click.stop="basculer('user')">
        <UserAvatar :nom="auth.user?.nom ?? '?'" taille="sm" />
        <span class="hidden md:block text-[13px] font-medium">{{ auth.user?.nom }}</span>
        <ChevronDown class="w-3.5 h-3.5 opacity-60" />

        <div v-if="ouvert === 'user'" :class="[dropdown, 'w-64 p-0']" @click.stop>
          <div class="flex items-center gap-2.5 px-4 py-3 bg-background border-b border-border">
            <UserAvatar :nom="auth.user?.nom ?? '?'" taille="lg" />
            <div class="min-w-0">
              <div class="text-[13px] font-bold text-foreground truncate">{{ auth.user?.nom }}</div>
              <div class="text-[11px] text-muted-foreground mt-0.5 truncate">
                {{ auth.libelleRole }} · {{ auth.user?.entiteNom }}
              </div>
            </div>
          </div>

          <div class="px-4 py-2 border-b border-border">
            <div class="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">Identifiant</div>
            <div class="text-xs font-mono text-foreground mt-0.5">{{ auth.user?.identifiant }}</div>
          </div>

          <div :class="item" @click.stop="allerAuProfil">
            <CircleUser class="w-4 h-4" /><span>Mon profil</span>
          </div>
          <div
            class="flex items-center gap-2 px-4 py-[9px] text-[13px] cursor-pointer text-foreground transition-colors hover:bg-danger-bg hover:text-danger"
            @click.stop="deconnexion"
          >
            <LogOut class="w-4 h-4" /><span>Se déconnecter</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Superposition Paramètres : reste ouverte par-dessus n'importe quelle page, ne navigue jamais ailleurs. -->
  <div v-if="parametresOuverts" class="fixed inset-0 z-[1000] flex items-start justify-center bg-black/40 overflow-y-auto py-10" @click.self="parametresOuverts = false">
    <div class="bg-card rounded-xl shadow-xl w-full max-w-2xl mx-4">
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div>
          <h2 class="text-[15px] font-semibold text-foreground">Paramètres · Modules</h2>
          <p class="text-[12px] text-muted-foreground mt-0.5">Activation des fonctionnalités de la base commune FMS</p>
        </div>
        <button class="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground cursor-pointer hover:bg-background" @click="parametresOuverts = false"><X class="w-4 h-4" /></button>
      </div>
      <div class="px-5 py-4">
        <ParametresModulesContent />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { Bell, ChevronDown, CircleUser, LogOut, Settings, X } from '@lucide/vue'
import UserAvatar from './ui/UserAvatar.vue'
import ParametresModulesContent from './ParametresModulesContent.vue'
import { useAuthStore } from '../stores/auth'
import { useNotificationStore } from '../stores/notifications'

const router = useRouter()
const auth = useAuthStore()
const notifs = useNotificationStore()
const parametresOuverts = ref(false)

const iconBtn =
  'h-8 min-w-8 rounded-md flex items-center justify-center cursor-pointer relative shrink-0 text-white transition-colors hover:bg-white/10 select-none'
const dropdown =
  'absolute top-[calc(100%+8px)] right-0 bg-popover text-popover-foreground rounded-lg shadow-[0_6px_24px_rgba(0,0,0,0.18)] border border-border z-[200] overflow-hidden cursor-default text-left'
const item =
  'flex items-center gap-2 px-4 py-[9px] text-[13px] cursor-pointer text-foreground transition-colors hover:bg-primary/10 hover:text-primary'

const POINT: Record<string, string> = {
  echeance: 'bg-warning',
  habilitation: 'bg-danger',
  systeme: 'bg-neutral',
}

const ouvert = ref<'user' | 'notif' | null>(null)
function basculer(n: 'user' | 'notif') {
  ouvert.value = ouvert.value === n ? null : n
}

function allerAuProfil() {
  ouvert.value = null
  router.push({ name: 'mon-profil' })
}

function deconnexion() {
  ouvert.value = null
  auth.logout()
  router.push({ name: 'login' })
}

function fermer() { ouvert.value = null }
onMounted(() => document.addEventListener('click', fermer))
onUnmounted(() => document.removeEventListener('click', fermer))
</script>
