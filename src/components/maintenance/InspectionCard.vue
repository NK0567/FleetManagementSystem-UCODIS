<script setup lang="ts">
/** Rapport d'une inspection périodique, daté et signé, exportable en PDF. */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import ChampLecture from './ChampLecture.vue'
import BoutonsExport from '../shared/BoutonsExport.vue'
import type { Rapport } from '../../lib/rapports'
import { useInspectionsStore, LIB_VERDICT } from '../../stores/inspections'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as F from '../../lib/formClasses'

const props = defineProps<{ ids: string[]; inspectionId: string }>()
const emit = defineEmits<{ close: []; 'contre-visite': [vehiculeId: string] }>()
const store = useInspectionsStore()
const router = useRouter()

const idCourant = ref(props.inspectionId)
const item = computed(() => store.getById(idCourant.value) ?? null)
const index = computed(() => props.ids.indexOf(idCourant.value))
const sidebarItems = computed(() => props.ids.map(id => ({ no: id, label: store.getById(id)?.tracteurPlaque })))
function naviguer(d: number) { const c = props.ids[index.value + d]; if (c) idCourant.value = c }

const parCategorie = computed(() => {
  const a = item.value; if (!a) return []
  const cats = new Map<string, { code: string; libelle: string; verdict: keyof typeof LIB_VERDICT; observation?: string }[]>()
  a.resultats.forEach(r => {
    const p = store.poste(a, r.code)
    cats.set(p.categorie, [...(cats.get(p.categorie) ?? []), { code: r.code, libelle: p.libelle, verdict: r.verdict, observation: r.observation }])
  })
  return [...cats.entries()]
})
const origine = computed(() => item.value?.contreVisiteDe ? store.getById(item.value.contreVisiteDe) : undefined)
const suite = computed(() => item.value?.leveeParId ? store.getById(item.value.leveeParId) : undefined)
const enAttente = computed(() => !!item.value && !item.value.conforme && !item.value.leveeParId)

/** Rapport daté et signé, construit au moment de l'export. */
function rapport(): Rapport {
  const a = item.value
  if (!a) return { titre: 'Rapport d\'inspection', sections: [] }
  const ident: [string, string][] = [
    ['Référence', a.reference], ['Date', fmtDateHeure(a.date)], ['Tracteur', a.tracteurPlaque], ['Semi-remorque', a.semiRemorquePlaque ?? '-'],
    ['Inspecteur', a.auditeur], ['Signé par', `${a.signataire ?? '-'}${a.signeLe ? `, le ${fmtDateHeure(a.signeLe)}` : ''}`],
    ['Résultat', a.conforme ? 'Conforme' : 'Non conforme'],
  ]
  if (a.contreVisiteLe) ident.push(['Contre-visite prévue le', fmtDateHeure(a.contreVisiteLe)])
  if (origine.value) ident.push(['Contre-visite de', origine.value.reference])
  if (a.commentaire) ident.push(['Commentaire', a.commentaire])
  return {
    titre: `Rapport d'inspection ${a.reference}`,
    sousTitre: `${a.tracteurPlaque} · ${fmtDateHeure(a.date)} · signé par ${a.signataire ?? '-'}`,
    sections: [
      { titre: 'Identification', colonnes: ['Rubrique', 'Valeur'], lignes: ident },
      ...parCategorie.value.map(([categorie, postes]) => ({
        titre: categorie, colonnes: ['Code', 'Poste', 'Verdict', 'Observation'],
        lignes: postes.map(p => [p.code, p.libelle, LIB_VERDICT[p.verdict].label, p.observation ?? '']),
      })),
    ],
  }
}
</script>

<template>
  <CardModalShell v-if="item" page-title="Inspection périodique" :page-number="item.reference" banner-label="Flotte · Contrôles"
    :is-edit-mode="false" :sidebar-items="sidebarItems" :current-no="item.id" :has-prev="index > 0" :has-next="index >= 0 && index < ids.length - 1"
    hide-action-bar @close="emit('close')" @go-prev="naviguer(-1)" @go-next="naviguer(1)" @select-sidebar="no => { if (store.getById(no)) idCourant = no }">
    <template #title-badges>
      <span class="text-xs font-medium px-2.5 py-0.5 rounded-full" :class="item.conforme ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ item.conforme ? 'Conforme' : 'Non conforme' }}</span>
      <span v-if="item.contreVisiteDe" class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-bg text-neutral">Contre-visite</span>
    </template>
    <template #form>
      <div class="px-6 py-5 max-w-3xl mx-auto">
        <div class="flex justify-end mb-3"><BoutonsExport :rapport="rapport" /></div>
        <FormSection title="Identification" :recaps="[item.tracteurPlaque, fmtDateHeure(item.date)]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture libelle="Référence" mono>{{ item.reference }}</ChampLecture>
            <ChampLecture libelle="Date">{{ fmtDateHeure(item.date) }}</ChampLecture>
            <ChampLecture libelle="Tracteur" mono>{{ item.tracteurPlaque }}</ChampLecture>
            <ChampLecture libelle="Semi-remorque" mono>{{ item.semiRemorquePlaque ?? '-' }}</ChampLecture>
            <ChampLecture libelle="Inspecteur">{{ item.auditeur }}</ChampLecture>
            <ChampLecture libelle="Signé par">{{ item.signataire ?? '-' }}{{ item.signeLe ? `, le ${fmtDateHeure(item.signeLe)}` : '' }}</ChampLecture>
            <ChampLecture v-if="item.commentaire" libelle="Commentaire" large>{{ item.commentaire }}</ChampLecture>
          </div>
        </FormSection>

        <FormSection v-if="!item.conforme || item.contreVisiteDe" title="Suite" :recaps="[enAttente ? 'Contre-visite à réaliser' : '']" :default-open="true">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <ChampLecture v-if="item.contreVisiteLe" libelle="Contre-visite prévue le">{{ fmtDateHeure(item.contreVisiteLe) }}</ChampLecture>
            <ChampLecture v-if="item.ordreTravailId" libelle="Ordre de travail" mono>{{ item.ordreTravailId }}</ChampLecture>
            <ChampLecture v-if="origine" libelle="Contre-visite de" mono>{{ origine.reference }}</ChampLecture>
            <ChampLecture v-if="suite" libelle="Contre-visite réalisée" mono>{{ suite.reference }}, {{ suite.conforme ? 'conforme' : 'non conforme' }}</ChampLecture>
            <ChampLecture v-if="!item.conforme" libelle="Aptitude à charger">{{ enAttente ? 'Non apte jusqu’à une contre-visite conforme' : 'Rétablie par la contre-visite' }}</ChampLecture>
          </div>
          <div class="flex gap-2 mt-3 flex-wrap">
            <button v-if="item.ordreTravailId" :class="F.btnOutline" @click="router.push({ name: 'maintenance-ordres', query: { ot: item.ordreTravailId } })">Ouvrir l'ordre de travail</button>
            <button v-if="enAttente" :class="F.btnPrimary" @click="emit('contre-visite', item.vehiculeId)">Réaliser la contre-visite</button>
          </div>
        </FormSection>

        <FormSection v-for="[categorie, postes] in parCategorie" :key="categorie" :title="categorie" :recaps="[`${postes.length} poste(s)`]">
          <div v-for="p in postes" :key="p.code" class="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
            <div class="min-w-0">
              <p class="text-xs font-mono text-muted-foreground">{{ p.code }}</p>
              <p class="text-[13px] text-foreground">{{ p.libelle }}</p>
              <p v-if="p.observation" class="text-[11px] text-muted-foreground mt-0.5">{{ p.observation }}</p>
            </div>
            <span class="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0" :class="LIB_VERDICT[p.verdict].cls">{{ LIB_VERDICT[p.verdict].label }}</span>
          </div>
        </FormSection>
      </div>
    </template>
  </CardModalShell>
</template>
