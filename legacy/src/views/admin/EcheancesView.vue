<template>
  <div :class="L.pageWrap">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Échéances</div>
        <div :class="L.pageSub">
          Alerte à {{ params.valeurs.seuilAlerteJours }} jours, escalade après
          {{ params.valeurs.escaladeJours }} jours sans réponse
        </div>
      </div>
      <RouterLink :to="{ name: 'admin-regles' }" :class="L.btnOutline">
        <Settings class="w-4 h-4" /> Régler le seuil
      </RouterLink>
    </div>

    <!-- Expirées -->
    <section v-if="docs.expirees.length" class="mb-4">
      <div class="flex items-center gap-2 mb-2">
        <TriangleAlert class="w-4 h-4 text-danger" />
        <h2 class="text-[14px] font-semibold text-danger">
          Expirées · {{ docs.expirees.length }}
        </h2>
      </div>
      <div class="bg-card border border-danger/25 rounded-lg overflow-hidden">
        <Ligne v-for="e in docs.expirees" :key="e.doc.id" :e="e" @ouvrir="ouvrir" />
      </div>
      <p class="text-[11px] text-muted-foreground mt-2">
        Tant qu'une pièce obligatoire est expirée, la personne ne peut pas être affectée à un camion.
      </p>
    </section>

    <!-- Proches -->
    <section v-if="docs.proches.length" class="mb-4">
      <div class="flex items-center gap-2 mb-2">
        <CalendarClock class="w-4 h-4 text-warning" />
        <h2 class="text-[14px] font-semibold text-warning">
          À renouveler dans les {{ params.valeurs.seuilAlerteJours }} jours · {{ docs.proches.length }}
        </h2>
      </div>
      <div class="bg-card border border-warning/30 rounded-lg overflow-hidden">
        <Ligne v-for="e in docs.proches" :key="e.doc.id" :e="e" @ouvrir="ouvrir" />
      </div>
    </section>

    <!-- Le reste -->
    <section>
      <div class="flex items-center gap-2 mb-2">
        <CircleCheck class="w-4 h-4 text-success" />
        <h2 class="text-[14px] font-semibold text-foreground">
          Valides · {{ valides.length }}
        </h2>
      </div>
      <div class="bg-card border border-border rounded-lg overflow-hidden">
        <Ligne v-for="e in valides" :key="e.doc.id" :e="e" @ouvrir="ouvrir" />
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, type PropType } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { CalendarClock, ChevronRight, CircleCheck, Settings, TriangleAlert } from '@lucide/vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import * as L from '../../lib/listClasses'
import { formatDate, joursRestants } from '../../utils/helpers'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import { useParametresStore } from '../../stores/parametres'

const router = useRouter()
const docs = useDocumentsStore()
const params = useParametresStore()

const valides = computed(() => docs.echeances.filter(e => e.etat === 'valide'))

function ouvrir(personnelId: string) {
  router.push({ name: 'admin-personnel-detail', params: { id: personnelId } })
}

type Echeance = (typeof docs.echeances)[number]

const Ligne = defineComponent({
  props: { e: { type: Object as PropType<Echeance>, required: true } },
  emits: ['ouvrir'],
  setup(props, { emit }) {
    return () => {
      const j = joursRestants(props.e.doc.dateExpiration)
      const delai =
        j === null ? '' : j < 0 ? `Dépassé de ${Math.abs(j)} j` : j === 0 ? "Aujourd'hui" : `Dans ${j} j`
      const couleurDelai =
        props.e.etat === 'expire' ? 'text-danger' : props.e.etat === 'proche' ? 'text-warning' : 'text-muted-foreground'

      return h(
        'div',
        {
          class:
            'flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 cursor-pointer hover:bg-background transition-colors',
          onClick: () => emit('ouvrir', props.e.doc.personnelId),
        },
        [
          h(UserAvatar, { nom: props.e.personnelNom, taille: 'sm' }),
          h('div', { class: 'min-w-0 flex-1' }, [
            h('div', { class: 'text-[13px] font-medium truncate' }, props.e.personnelNom),
            h('div', { class: 'text-[11px] text-muted-foreground' }, props.e.fonction),
          ]),
          h('div', { class: 'w-[190px] shrink-0 max-sm:hidden' }, [
            h('div', { class: 'text-[13px]' }, props.e.doc.libelle),
            props.e.doc.reference
              ? h('div', { class: 'text-[11px] text-muted-foreground font-mono' }, props.e.doc.reference)
              : null,
          ]),
          h('div', { class: 'w-[100px] shrink-0 text-right text-[13px] tabular-nums' },
            formatDate(props.e.doc.dateExpiration)),
          h('div', { class: `w-[110px] shrink-0 text-right text-[12px] font-medium ${couleurDelai}` }, delai),
          h(ChevronRight, { class: 'w-4 h-4 text-muted-foreground shrink-0' }),
        ],
      )
    }
  },
})
</script>
