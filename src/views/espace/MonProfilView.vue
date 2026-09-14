<template>
  <div :class="L.pageWrap" class="max-w-[800px]">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Mon profil</div>
        <div :class="L.pageSub">Les informations enregistrées à votre sujet</div>
      </div>
    </div>

    <div class="bg-card border border-border rounded-lg p-5 mb-3 flex items-center gap-4">
      <UserAvatar :nom="auth.user?.nom ?? '?'" taille="lg" />
      <div class="min-w-0">
        <div class="text-xl font-bold text-foreground">{{ auth.user?.nom }}</div>
        <div class="text-[13px] text-muted-foreground mt-0.5">
          {{ auth.libelleRole }} · {{ auth.user?.entiteNom }}
        </div>
        <div class="text-[12px] text-muted-foreground mt-0.5 font-mono">{{ auth.user?.identifiant }}</div>
      </div>
    </div>

    <div v-if="moi" class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
      <div :class="L.card">
        <div :class="L.cardTitle"><CircleUser class="w-4 h-4 text-primary" /> Identité</div>
        <dl class="flex flex-col gap-2.5">
          <Champ libelle="Matricule" :valeur="moi.matricule" />
          <Champ libelle="Date de naissance" :valeur="formatDate(moi.dateNaissance)" />
          <Champ libelle="CIN" :valeur="moi.cin" />
          <Champ libelle="Téléphone" :valeur="moi.telephone" />
          <Champ libelle="Courriel" :valeur="moi.email || '-'" />
        </dl>
      </div>

      <div :class="L.card">
        <div :class="L.cardTitle"><Briefcase class="w-4 h-4 text-primary" /> Situation</div>
        <dl class="flex flex-col gap-2.5">
          <Champ libelle="Fonction" :valeur="moi.fonctionLibelle" />
          <Champ libelle="Service" :valeur="moi.entiteNom" />
          <Champ libelle="Site" :valeur="moi.site" />
          <Champ libelle="Contrat" :valeur="moi.contrat" />
          <Champ libelle="Date d'entrée" :valeur="formatDate(moi.dateEntree)" />
        </dl>
      </div>
    </div>

    <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed">
      Une erreur dans ces informations se corrige auprès du responsable flotte.
      Vous ne pouvez pas les modifier vous-même.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import { Briefcase, CircleUser } from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import * as L from '../../lib/listClasses'
import { formatDate } from '../../utils/helpers'
import { useAuthStore } from '../../stores/auth'
import { usePersonnelStore } from '../../stores/personnel'

const auth = useAuthStore()
const personnel = usePersonnelStore()

const moi = computed(() => (auth.user?.personnelId ? personnel.parId(auth.user.personnelId) : null))

const Champ = defineComponent({
  props: { libelle: String, valeur: String },
  setup(props) {
    return () =>
      h('div', { class: 'flex items-baseline gap-3' }, [
        h('dt', { class: 'text-[11px] text-muted-foreground w-[130px] shrink-0' }, props.libelle),
        h('dd', { class: 'text-[13px] text-foreground font-medium min-w-0 break-words' }, props.valeur),
      ])
  },
})
</script>
