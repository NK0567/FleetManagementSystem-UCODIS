<template>
  <aside class="w-[224px] shrink-0 bg-sidebar border-r border-sidebar-border py-2.5 px-[5px] overflow-y-auto overflow-x-hidden hidden md:block">

    <!-- ══════════ CÔTÉ GESTION ══════════ -->
    <template v-if="auth.cotéGestion">

      <!-- MODULE : Administration / Personnel -->
      <template v-if="nav.moduleActif === 'administration'">
        <Section libelle="Tableau de bord">
          <Item :icone="LayoutDashboard" libelle="Vue d'ensemble" :to="{ name: 'admin-tableau-bord' }" />
          <Item :icone="CalendarRange"   libelle="Mon planning"   :to="{ name: 'admin-planning' }" />
        </Section>

        <Section libelle="Congés & absences">
          <Item :icone="CalendarOff" libelle="Demandes" :to="{ name: 'admin-demandes' }" :badge="enAttente" />
          <Item :icone="ChartPie"    libelle="Soldes"   :to="{ name: 'admin-soldes' }" />
        </Section>

        <Section libelle="Personnel">
          <Item :icone="Users"    libelle="Employés"     :to="{ name: 'admin-employes' }"
                :force-actif="route.name === 'admin-employe-detail'" />
          <Item :icone="Building" libelle="Entités"      :to="{ name: 'admin-entites' }" />
          <Item :icone="Network"  libelle="Organigramme" :to="{ name: 'admin-organigramme' }" />
        </Section>

        <Section libelle="Configuration">
          <Item :icone="CalendarDays" libelle="Calendrier"     :to="{ name: 'admin-calendrier' }" />
          <Item :icone="Tag"          libelle="Classification" :to="{ name: 'admin-classification' }" />
        </Section>
      </template>

      <!-- MODULE : Flotte -->
      <template v-else-if="nav.moduleActif === 'flotte'">
        <Section libelle="Tableau de bord">
          <Item :icone="LayoutDashboard" libelle="Vue d'ensemble" :to="{ name: 'flotte-tableau-bord' }" />
          <Item v-if="params.estActif('carte_temps_reel')" :icone="MapPin" libelle="Carte temps réel" :to="{ name: 'flotte-carte' }" />
        </Section>

        <Section v-if="params.estActif('voyages') || params.estActif('conformite') || params.estActif('carburant')" libelle="Exploitation">
          <Item v-if="params.estActif('voyages')" :icone="Package" libelle="Voyages" :to="{ name: 'flotte-voyages' }" />
          <Item v-if="params.estActif('conformite')" :icone="ShieldCheck" libelle="Conformité" :to="{ name: 'flotte-conformite' }" />
          <Item v-if="params.estActif('carburant')" :icone="Fuel" libelle="Carburant" :to="{ name: 'flotte-carburant' }" />
        </Section>

        <Section libelle="Parc véhicules">
          <Item :icone="Truck" libelle="Véhicules" :to="{ name: 'flotte-vehicules' }"
                :force-actif="route.name === 'flotte-detail'" />
          <Item v-if="params.estActif('etat_flotte')" :icone="ClipboardList" libelle="État de flotte" :to="{ name: 'flotte-etat' }" />
          <Item v-if="params.estActif('controles')" :icone="ListChecks" libelle="Contrôles" :to="{ name: 'flotte-controles' }" />
          <Item v-if="params.estActif('departs')" :icone="LogOut" libelle="Départs" :to="{ name: 'flotte-departs' }" />
          <Item v-if="params.estActif('assurances')" :icone="ShieldCheck" libelle="Assurances" :to="{ name: 'flotte-assurances' }" />
          <Item v-if="params.estActif('conducteurs_flotte')" :icone="IdCard" libelle="Conducteurs" :to="{ name: 'flotte-conducteurs' }" />
          <Item :icone="Link2" libelle="Attelages" :to="{ name: 'flotte-attelages' }" />
          <Item :icone="UserCheck" libelle="Affectations" :to="{ name: 'flotte-affectations' }" />
        </Section>

        <Section v-if="params.estActif('telemetrie')" libelle="Suivi & télémétrie">
          <Item :icone="Radio" libelle="Télémétrie" :to="{ name: 'flotte-telemetrie' }" />
        </Section>

        <Section v-if="params.estActif('sites_geofences')" libelle="Sites & géofences">
          <Item :icone="MapPinned" libelle="Sites" :to="{ name: 'flotte-sites' }" />
        </Section>

        <Section v-if="params.estActif('documents')" libelle="Documents">
          <Item :icone="FileText" libelle="Documents" :to="{ name: 'flotte-documents-vehicule' }" />
        </Section>

        <Section v-if="params.estActif('configuration')" libelle="Paramétrage">
          <Item :icone="Settings2" libelle="Configuration" :to="{ name: 'flotte-configuration' }" />
        </Section>
      </template>

      <template v-else-if="nav.moduleActif === 'maintenance'">
        <Section libelle="Tableau de bord">
          <Item :icone="LayoutDashboard" libelle="Vue d'ensemble" :to="{ name: 'maintenance-dashboard' }" />
        </Section>

        <Section libelle="Interventions">
          <Item :icone="Wrench" libelle="Ordres de travail" :to="{ name: 'maintenance-ordres' }" />
          <Item :icone="CalendarClock" libelle="Plans d'entretien" :to="{ name: 'maintenance-plans' }" />
          <Item v-if="params.estActif('maintenance_echeances')" :icone="AlertTriangle" libelle="Échéances" :to="{ name: 'maintenance-echeances' }" />
          <Item v-if="params.estActif('maintenance_indisponibilites')" :icone="CalendarOff" libelle="Indisponibilités" :to="{ name: 'maintenance-indisponibilites' }" />
        </Section>

        <Section v-if="params.estActif('maintenance_atelier') || params.estActif('maintenance_fiabilite')" libelle="Analyse">
          <Item v-if="params.estActif('maintenance_atelier')" :icone="Users" libelle="Charge d'atelier" :to="{ name: 'maintenance-atelier' }" />
          <Item v-if="params.estActif('maintenance_fiabilite')" :icone="Gauge" libelle="Fiabilité" :to="{ name: 'maintenance-fiabilite' }" />
        </Section>

        <Section libelle="Paramétrage">
          <Item :icone="Settings2" libelle="Paramètres de l'atelier" :to="{ name: 'maintenance-parametres' }" />
        </Section>
      </template>
    </template>

    <!-- ══════════ CÔTÉ TERRAIN (conducteur, aide conducteur) ══════════ -->
    <template v-else>
      <Section libelle="Mon espace">
        <Item :icone="LayoutDashboard" libelle="Ma situation" :to="{ name: 'espace-accueil' }" />
        <Item :icone="CalendarOff"     libelle="Mes absences" :to="{ name: 'espace-absences' }" />
        <Item :icone="CircleUser"      libelle="Mon profil"   :to="{ name: 'mon-profil' }" />
      </Section>
    </template>

  </aside>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, type Component, type PropType } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  Building, CalendarClock, CalendarDays, CalendarOff, CalendarRange, ChartPie, CircleUser,
  ClipboardList, Fuel, Gauge, IdCard, LayoutDashboard, Link2, ListChecks, LogOut,
  MapPin, MapPinned, Network, Package, Radio, ShieldCheck, FileText, Settings2,
  Tag, TriangleAlert as AlertTriangle, Truck, UserCheck, Users, Wrench,
} from '@lucide/vue'
import { useAuthStore } from '../stores/auth'
import { useNavigationStore } from '../stores/navigation'
import { useParametresModulesStore } from '../stores/parametresModules'
import { useAbsenceStore } from '../stores/absences'

const auth = useAuthStore()
const nav = useNavigationStore()
const params = useParametresModulesStore()
const absences = useAbsenceStore()
const route = useRoute()

const enAttente = computed(() => absences.enAttente.length)

const itemClass =
  'flex items-center gap-2 py-[7px] pr-3 pl-6 text-[13px] text-sidebar-foreground/75 cursor-pointer transition-colors no-underline select-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
const itemActif =
  'bg-sidebar-accent text-white font-semibold border-l-[3px] border-sidebar-primary pl-[21px]'
const badgeClass = 'ml-auto bg-primary text-white text-[9px] font-bold px-1.5 py-px rounded-full'

const Section = defineComponent({
  props: { libelle: String },
  setup(props, { slots }) {
    return () =>
      h('div', { class: 'mb-1.5' }, [
        h(
          'div',
          { class: 'text-[10px] font-bold text-sidebar-foreground/45 uppercase tracking-[0.08em] pt-2.5 pb-1 pr-4 pl-5' },
          props.libelle,
        ),
        slots.default?.(),
      ])
  },
})

const Item = defineComponent({
  props: {
    icone: { type: [Object, Function] as PropType<Component>, required: true },
    libelle: { type: String, required: true },
    to: { type: Object, required: true },
    badge: { type: Number, default: 0 },
    forceActif: { type: Boolean, default: false },
  },
  setup(props) {
    const router = useRouter()

    /**
     * Garde-fou : RouterLink lève une exception si la route nommée n'existe
     * pas, et l'exception interrompt le rendu de tout ce qui suit · la
     * moitié du menu disparaît sans message. On vérifie donc avant.
     */
    const existe = computed(() => {
      const nom = (props.to as { name?: string }).name
      return nom ? router.hasRoute(nom) : true
    })

    return () => {
      const enfants = [
        h(props.icone, { class: 'w-4 h-4 shrink-0' }),
        h('span', { class: 'flex-1' }, props.libelle),
        props.badge > 0 ? h('span', { class: badgeClass }, String(props.badge)) : null,
      ].filter(Boolean)

      if (!existe.value) {
        return h('div', { class: itemClass + ' opacity-40 cursor-not-allowed', title: 'Écran non installé' }, enfants)
      }

      return h(
        RouterLink,
        {
          to: props.to,
          class: props.forceActif ? [itemClass, itemActif] : itemClass,
          activeClass: itemActif,
        },
        () => enfants,
      )
    }
  },
})
</script>
