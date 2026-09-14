<template>
  <div class="min-h-screen flex items-center justify-center bg-primary/10 max-[480px]:items-start max-[480px]:p-4">
    <div class="bg-card rounded-xl p-10 w-full max-w-[460px] shadow-[0_2px_16px_rgba(0,0,0,0.08)] max-[480px]:p-6 max-[480px]:w-[90%] max-[480px]:my-4">

      <div class="flex justify-center mb-4">
        <img :src="logo" class="h-14 w-auto object-contain bg-white rounded-lg px-2 py-1" alt="HV" />
      </div>

      <h1 class="text-[22px] font-bold text-foreground text-center mb-1">HV Fleet Management System</h1>
      <p class="text-[13px] text-muted-foreground text-center mb-6">
        Connexion · filiale UCODIS Transport
      </p>

      <div class="mb-4">
        <label for="identifiant" :class="labelClass">Identifiant</label>
        <input
          id="identifiant" v-model="identifiant" type="text"
          placeholder="FLT001" autocomplete="off" :class="inputClass"
          @keyup.enter="connexion"
        />
      </div>

      <div class="mb-4">
        <label for="motdepasse" :class="labelClass">Mot de passe</label>
        <div class="relative">
          <input
            id="motdepasse" v-model="motDePasse"
            :type="visible ? 'text' : 'password'"
            placeholder="••••••••" :class="[inputClass, 'pr-11']"
            @keyup.enter="connexion"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer text-muted-foreground flex items-center hover:text-foreground"
            tabindex="-1" @click="visible = !visible"
          >
            <EyeOff v-if="visible" class="w-[18px] h-[18px]" />
            <Eye v-else class="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      <p v-if="erreur" class="text-xs text-danger bg-danger-bg px-3 py-2 rounded-md mb-3.5">{{ erreur }}</p>

      <button
        class="w-full h-12 bg-primary text-primary-foreground rounded-lg text-sm font-semibold cursor-pointer transition-colors flex items-center justify-center gap-2 mb-5 hover:bg-primary/90"
        @click="connexion"
      >
        <ArrowRight class="w-[18px] h-[18px]" />
        Se connecter
      </button>

      <!-- Sélecteur de rôle temporaire · sera supprimé en production -->
      <div class="mt-1">
        <label :class="[labelClass, 'mb-1.5']">
          Rôle de démonstration
          <span class="text-[9px] bg-warning-bg text-warning px-1.5 py-0.5 rounded ml-1.5">DEV UNIQUEMENT</span>
        </label>
        <p class="text-[11px] text-muted-foreground mb-2.5 leading-relaxed">
          En production, le rôle viendra du compte, pas de ce sélecteur.
        </p>

        <div class="grid grid-cols-3 max-sm:grid-cols-2 gap-2">
          <div
            v-for="r in ROLES" :key="r.valeur"
            :class="[roleOptClass, roleChoisi === r.valeur && roleOptSelected]"
            @click="choisir(r.valeur)"
          >
            <component :is="r.icone" class="w-[18px] h-[18px] mx-auto mb-1" />
            <div class="text-[11px] font-semibold mt-1 leading-tight">{{ r.libelle }}</div>
            <div class="text-[9px] mt-0.5 leading-[1.3]" :class="roleChoisi === r.valeur ? 'text-primary/80' : 'text-muted-foreground'">{{ r.detail }}</div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  Eye, EyeOff, ArrowRight, ShieldCheck, Truck, Wrench, Headset,
  Briefcase, Warehouse, ChartNoAxesColumn, IdCard, Users,
} from '@lucide/vue'
import logo from '../assets/logo-ucodis.png'
import { useAuthStore } from '../stores/auth'
import type { RoleUtilisateur } from '../types'

const router = useRouter()
const auth = useAuthStore()

const identifiant = ref('FLT001')
const motDePasse = ref('demo')
const visible = ref(false)
const erreur = ref('')
const roleChoisi = ref<RoleUtilisateur>('responsable_flotte')

const labelClass = 'block text-[13px] font-medium text-foreground mb-1.5'
const inputClass = 'w-full h-12 px-3 border border-border rounded-lg text-sm bg-primary/10 text-foreground outline-none transition-colors focus:border-primary focus:bg-card'
const roleOptClass = 'p-2.5 border border-border rounded-md text-center cursor-pointer text-xs text-muted-foreground transition-colors bg-card hover:border-primary/40'
const roleOptSelected = '!border-primary bg-primary/10 !text-primary font-medium'

interface Role { valeur: RoleUtilisateur; icone: Component; libelle: string; detail: string; code: string }

/** Les huit postes de la SOP, plus l'administrateur système. */
const ROLES: Role[] = [
  { valeur: 'admin', icone: ShieldCheck, libelle: 'Administrateur', detail: 'Accès complet', code: 'ADM001' },
  { valeur: 'responsable_flotte', icone: Truck, libelle: 'Responsable flotte', detail: 'Personnel + Flotte', code: 'FLT001' },
  { valeur: 'maintenancier', icone: Wrench, libelle: 'Maintenancier', detail: 'Flotte : lecture', code: 'MNT001' },
  { valeur: 'charge_clientele', icone: Headset, libelle: 'Chargé clientèle', detail: 'Consultation', code: 'CLI001' },
  { valeur: 'commercial', icone: Briefcase, libelle: 'Commercial', detail: 'Consultation', code: 'COM001' },
  { valeur: 'depot', icone: Warehouse, libelle: 'Équipe dépôt', detail: 'Consultation', code: 'DEP001' },
  { valeur: 'direction', icone: ChartNoAxesColumn, libelle: 'Direction', detail: 'Lecture seule', code: 'DIR001' },
  { valeur: 'conducteur', icone: IdCard, libelle: 'Conducteur', detail: 'Espace personnel', code: 'CND001' },
  { valeur: 'aide_conducteur', icone: Users, libelle: 'Aide conducteur', detail: 'Espace personnel', code: 'AID001' },
]

function choisir(v: RoleUtilisateur) {
  roleChoisi.value = v
  identifiant.value = ROLES.find(r => r.valeur === v)?.code ?? ''
}

function connexion() {
  if (!identifiant.value || !motDePasse.value) {
    erreur.value = 'Renseignez votre identifiant et votre mot de passe.'
    return
  }
  erreur.value = ''
  auth.login(roleChoisi.value)
  router.push(auth.cotéGestion ? { name: 'admin-tableau-bord' } : { name: 'espace-accueil' })
}
</script>
