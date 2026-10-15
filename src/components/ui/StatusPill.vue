<template>
  <span
    class="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-medium whitespace-nowrap"
    :class="cfg.classe"
  >{{ cfg.libelle }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ statut: string; libelle?: string }>()

const CONFIG: Record<string, { libelle: string; classe: string }> = {
  actif:     { libelle: 'Actif',      classe: 'bg-success-bg text-success' },
  conge:     { libelle: 'En congé',   classe: 'bg-info-bg text-info' },
  suspendu:  { libelle: 'Suspendu',   classe: 'bg-danger-bg text-danger' },
  archive:   { libelle: 'Archivé',    classe: 'bg-neutral-bg text-neutral' },
  valide:    { libelle: 'Valide',     classe: 'bg-success-bg text-success' },
  proche:    { libelle: 'À renouveler', classe: 'bg-warning-bg text-warning' },
  expire:    { libelle: 'Expiré',     classe: 'bg-danger-bg text-danger' },
  absent:    { libelle: 'Manquant',   classe: 'bg-neutral-bg text-neutral' },
  annule:    { libelle: 'Annulé',     classe: 'bg-danger-bg text-danger' },
  perdu:     { libelle: 'Perdu',      classe: 'bg-danger-bg text-danger' },
  habilite:  { libelle: 'Habilité',   classe: 'bg-success-bg text-success' },
  non_habilite: { libelle: 'Non habilité', classe: 'bg-danger-bg text-danger' },
  sans_objet: { libelle: 'Sans objet', classe: 'bg-neutral-bg text-neutral' },
  ouvert:    { libelle: 'Ouvert',     classe: 'bg-success-bg text-success' },
  ferme:     { libelle: 'Désactivé',  classe: 'bg-neutral-bg text-neutral' },
  // Statuts véhicule (module 1)
  disponible:     { libelle: 'Disponible',     classe: 'bg-success-bg text-success' },
  affecte:        { libelle: 'Affecté',        classe: 'bg-info-bg text-info' },
  en_mission:     { libelle: 'En mission',     classe: 'bg-primary/10 text-primary' },
  en_maintenance: { libelle: 'En maintenance', classe: 'bg-warning-bg text-warning' },
  immobilise:     { libelle: 'Immobilisé',     classe: 'bg-danger-bg text-danger' },
  hors_service:   { libelle: 'Hors service',   classe: 'bg-danger-bg text-danger' },
  sorti:          { libelle: 'Sorti du parc',  classe: 'bg-neutral-bg text-neutral' },
}

const cfg = computed(() => {
  const base = CONFIG[props.statut] ?? { libelle: props.statut, classe: 'bg-neutral-bg text-neutral' }
  return props.libelle ? { ...base, libelle: props.libelle } : base
})
</script>
