<template>
  <div :class="L.card" class="mt-5">
    <p class="text-sm font-semibold text-foreground">Planification : circuit des commandes</p>
    <p class="text-[12px] text-muted-foreground mb-4">Ces réglages adaptent le module à l'organisation de chaque entreprise : qui exprime les besoins de livraison, comment les commandes sont référencées, et ce que le planificateur peut faire lui-même.</p>

    <div class="flex flex-col gap-4">
      <div>
        <p :class="lbl">Qui émet les demandes de livraison</p>
        <p class="text-[11px] text-muted-foreground mb-2">Les rôles cochés disposent de l'espace « Demandes de livraison ». Chez UCODIS, c'est l'équipe commerciale.</p>
        <div class="flex flex-wrap gap-x-5 gap-y-1.5">
          <label v-for="r in ROLES" :key="r.valeur" class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
            <input type="checkbox" class="w-4 h-4 accent-primary" :checked="p.rolesEmetteurs.includes(r.valeur)" @change="basculerRole(r.valeur)" />
            {{ r.libelle }}
          </label>
        </div>
      </div>

      <label class="flex items-start gap-2 text-[13px] text-foreground cursor-pointer">
        <input type="checkbox" class="w-4 h-4 accent-primary mt-0.5" v-model="p.saisieParPlanificateur" />
        <span>Le planificateur peut saisir lui-même une commande dans un ordre de transport
          <span class="block text-[11px] text-muted-foreground">Désactivé : toute livraison part d'une demande émise. Activé : utile pour une entreprise sans émetteur distinct, ou pour un besoin exceptionnel.</span></span>
      </label>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="flex flex-col gap-1.5">
          <label :class="lbl">Libellé de la référence de commande</label>
          <input v-model="p.libelleReferenceExterne" :class="cls.fieldInput" placeholder="Ex. N° de bon de livraison, N° de commande…" />
          <span class="text-[11px] text-muted-foreground">La référence de la commande dans le système de gestion de l'entreprise.</span>
        </div>
        <div class="flex flex-col gap-1.5">
          <label :class="lbl">Unité de comptage des marchandises</label>
          <input v-model="p.uniteComptage" :class="cls.fieldInput" placeholder="Ex. cartons, colis, palettes" />
        </div>
      </div>

      <label class="flex items-center gap-2 text-[13px] text-foreground cursor-pointer">
        <input type="checkbox" class="w-4 h-4 accent-primary" v-model="p.referenceExterneObligatoire" />
        La référence de commande est obligatoire pour émettre une demande
      </label>

      <div class="flex justify-end">
        <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="store.reinitialiser()">Revenir aux réglages par défaut</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useParametresPlanificationStore } from '../stores/parametresPlanification'
import type { RoleUtilisateur } from '../types'
import * as L from '../lib/listClasses'
import * as cls from '../lib/formClasses'

const store = useParametresPlanificationStore()
const p = computed(() => store.parametres)
const lbl = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]'
const ROLES: { valeur: RoleUtilisateur; libelle: string }[] = [
  { valeur: 'commercial', libelle: 'Commercial' },
  { valeur: 'charge_clientele', libelle: 'Chargé clientèle' },
  { valeur: 'responsable_flotte', libelle: 'Responsable flotte' },
  { valeur: 'depot', libelle: 'Équipe dépôt' },
  { valeur: 'direction', libelle: 'Direction' },
  { valeur: 'admin', libelle: 'Administrateur' },
]
function basculerRole(r: RoleUtilisateur) {
  const l = store.parametres.rolesEmetteurs
  store.parametres.rolesEmetteurs = l.includes(r) ? l.filter(x => x !== r) : [...l, r]
}
</script>
