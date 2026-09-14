<template>
  <div :class="L.pageWrap" class="max-w-[1100px]">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Société et sites</div>
        <div :class="L.pageSub">Identité de l'entité et lieux d'exploitation</div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 max-lg:grid-cols-1">

      <!-- Identité -->
      <div :class="L.card">
        <div :class="L.cardTitle"><Landmark class="w-4 h-4 text-primary" /> Identité</div>
        <dl class="flex flex-col gap-3">
          <Champ libelle="Raison sociale" :valeur="s.raisonSociale" />
          <Champ libelle="Entité" :valeur="s.entite" />
          <Champ libelle="Activité" :valeur="s.activite" />
          <Champ libelle="Adresse" :valeur="s.adresse" />
          <Champ libelle="Pays" :valeur="s.pays" />
          <Champ libelle="NIF / STAT" :valeur="s.nifStat" manquant />
        </dl>
        <p class="text-[11px] text-muted-foreground mt-3.5 pt-3 border-t border-border leading-relaxed">
          Le NIF et le STAT restent à renseigner par UCODIS.
        </p>
      </div>

      <!-- Parc -->
      <div :class="L.card">
        <div :class="L.cardTitle"><Truck class="w-4 h-4 text-primary" /> Dimension du parc</div>

        <div class="flex gap-3 mb-4">
          <div class="flex-1 bg-background rounded-lg p-3.5 text-center">
            <div class="text-3xl font-bold text-foreground">{{ s.parcTracteurs }}</div>
            <div class="text-[11px] uppercase tracking-[0.06em] text-muted-foreground mt-1">Tracteurs</div>
          </div>
          <div class="flex-1 bg-background rounded-lg p-3.5 text-center">
            <div class="text-3xl font-bold text-foreground">{{ s.parcSemiRemorques }}</div>
            <div class="text-[11px] uppercase tracking-[0.06em] text-muted-foreground mt-1">Semi-remorques</div>
          </div>
          <div class="flex-1 bg-primary/[0.07] rounded-lg p-3.5 text-center border border-primary/20">
            <div class="text-3xl font-bold text-primary">{{ s.parcTracteurs + s.parcSemiRemorques }}</div>
            <div class="text-[11px] uppercase tracking-[0.06em] text-primary/75 mt-1">Véhicules</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sites -->
    <div :class="L.card" class="mt-3">
      <div :class="L.cardTitle" class="justify-between">
        <span class="flex items-center gap-1.5"><MapPin class="w-4 h-4 text-primary" /> Sites</span>
        <button v-if="auth.estAdmin" class="text-[12px] text-primary cursor-pointer font-normal">
          Ajouter un site
        </button>
      </div>

      <div class="grid grid-cols-3 gap-2.5 max-lg:grid-cols-1">
        <div v-for="site in params.sites" :key="site.id" class="bg-background rounded-lg p-3.5 border border-border">
          <div class="flex items-center gap-2 mb-1.5">
            <component :is="ICONE[site.type]" class="w-4 h-4 text-primary shrink-0" />
            <span class="text-[13px] font-semibold">{{ site.nom }}</span>
          </div>
          <div class="text-[12px] text-muted-foreground">{{ site.adresse }}</div>
          <div class="text-[11px] text-muted-foreground mt-2">
            {{ effectifSite(site.nom) }} personne(s) rattachée(s)
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import { Landmark, MapPin, Truck, Warehouse, Wrench } from '@lucide/vue'
import * as L from '../../lib/listClasses'
import { useAuthStore } from '../../stores/auth'
import { useParametresStore } from '../../stores/parametres'
import { usePersonnelStore } from '../../stores/personnel'

const auth = useAuthStore()
const params = useParametresStore()
const personnel = usePersonnelStore()

const s = computed(() => params.societe)

const ICONE = {
  siege: Landmark,
  depot: Warehouse,
  garage: Wrench,
}

function effectifSite(nom: string) {
  return personnel.actifs.filter(p => p.site === nom).length
}

const Champ = defineComponent({
  props: { libelle: String, valeur: String, manquant: Boolean },
  setup(props) {
    return () =>
      h('div', { class: 'flex items-baseline gap-3' }, [
        h('dt', { class: 'text-[11px] text-muted-foreground w-[120px] shrink-0' }, props.libelle),
        h(
          'dd',
          {
            class:
              'text-[13px] font-medium min-w-0 break-words ' +
              (props.manquant ? 'text-warning italic' : 'text-foreground'),
          },
          props.valeur,
        ),
      ])
  },
})
</script>
