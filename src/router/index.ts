import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import TableauBordView from '../views/admin/TableauBordView.vue'

const dashboard = { requiresAuth: true, layout: 'dashboard' as const }

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'login', component: LoginView },

    /* ══ MODULE ADMINISTRATION ═══════════════════════════════════
       Même découpage que sur les autres projets bâtis sur le socle FMS : tableau de
       bord, congés et absences, personnel, configuration.          */

    { path: '/administration', name: 'admin-tableau-bord', component: TableauBordView, meta: dashboard },
    { path: '/administration/planning', name: 'admin-planning',
      component: () => import('../views/admin/PlanningView.vue'), meta: dashboard },

    { path: '/administration/demandes', name: 'admin-demandes',
      component: () => import('../views/admin/DemandesView.vue'), meta: dashboard },
    { path: '/administration/soldes', name: 'admin-soldes',
      component: () => import('../views/admin/SoldesView.vue'), meta: dashboard },

    { path: '/administration/employes', name: 'admin-employes',
      component: () => import('../views/admin/EmployeListView.vue'), meta: dashboard },
    /* La fiche s'ouvre en superposition depuis la liste (double-clic).
       L'ancienne adresse de détail redirige vers la liste.               */
    { path: '/administration/employes/:id', redirect: { name: 'admin-employes' } },
    { path: '/administration/entites', name: 'admin-entites',
      component: () => import('../views/admin/EntiteListView.vue'), meta: dashboard },
    { path: '/administration/organigramme', name: 'admin-organigramme',
      component: () => import('../views/admin/OrganigrammeView.vue'), meta: dashboard },

    { path: '/administration/calendrier', name: 'admin-calendrier',
      component: () => import('../views/admin/CalendrierView.vue'), meta: dashboard },
    { path: '/administration/classification', name: 'admin-classification',
      component: () => import('../views/admin/ClassificationView.vue'), meta: dashboard },
    { path: '/administration/parametres', name: 'admin-parametres',
      component: () => import('../views/admin/ParametresModulesView.vue'), meta: dashboard },

    /* ══ MODULE PLANIFICATION ════════════════════════════════════
       Groupe des livraisons du futur TMS, étudié comme référence pour cette
       intégration : tableau kanban des ordres de transport, de leur création
       à leur clôture. Adapté à la logique d'UCODIS - des sites desservis sur
       un trajet plutôt que des lignes de commande et des colis, propres à un
       entrepôt de dispatching. */
    { path: '/planification', name: 'planification-kanban',
      component: () => import('../views/planification/PlanificationView.vue'), meta: dashboard },

    /* ══ MODULE FLOTTE ═══════════════════════════════════════════
       Module 1 du cahier des charges, comme sur les projets de référence
       (le socle FMS : onglet « Flotte », dossier views/fleet). Construit selon le
       même principe que l'Administration : le tableau de bord et la fiche
       véhicule d'abord, le reste (documents, contrôles, suivi temps réel)
       ensuite. */
    { path: '/flotte', name: 'flotte-tableau-bord',
      component: () => import('../views/flotte/TableauBordView.vue'), meta: dashboard },
    { path: '/flotte/carte', name: 'flotte-carte',
      component: () => import('../views/flotte/CarteTempsReelView.vue'), meta: dashboard },
    { path: '/flotte/vehicules', name: 'flotte-vehicules',
      component: () => import('../views/flotte/VehiculeListView.vue'), meta: dashboard },
    { path: '/flotte/attelages', name: 'flotte-attelages',
      component: () => import('../views/flotte/AttelagesView.vue'), meta: dashboard },
    { path: '/flotte/affectations', name: 'flotte-affectations',
      component: () => import('../views/flotte/AffectationsView.vue'), meta: dashboard },
    { path: '/flotte/telemetrie', name: 'flotte-telemetrie',
      component: () => import('../views/flotte/TelemetrieView.vue'), meta: dashboard },
    { path: '/flotte/etat', name: 'flotte-etat',
      component: () => import('../views/flotte/EtatFlotteView.vue'), meta: dashboard },
    { path: '/flotte/assurances', name: 'flotte-assurances',
      component: () => import('../views/flotte/AssurancesView.vue'), meta: dashboard },
    { path: '/flotte/documents-vehicule', name: 'flotte-documents-vehicule',
      component: () => import('../views/flotte/DocumentsVehiculeView.vue'), meta: dashboard },
    { path: '/flotte/conducteurs', name: 'flotte-conducteurs',
      component: () => import('../views/flotte/ConducteursFlotteView.vue'), meta: dashboard },
    { path: '/flotte/conducteurs/:id', name: 'flotte-conducteur-dashboard',
      component: () => import('../views/flotte/ConducteurDashboardView.vue'), meta: dashboard },
    { path: '/flotte/voyages', name: 'flotte-voyages',
      component: () => import('../views/flotte/VoyagesView.vue'), meta: dashboard },
    { path: '/flotte/conformite', name: 'flotte-conformite',
      component: () => import('../views/flotte/ConformiteView.vue'), meta: dashboard },
    { path: '/flotte/carburant', name: 'flotte-carburant',
      component: () => import('../views/flotte/CarburantView.vue'), meta: dashboard },
    { path: '/flotte/controles', name: 'flotte-controles',
      component: () => import('../views/flotte/ControlesView.vue'), meta: dashboard },
    { path: '/flotte/departs', name: 'flotte-departs',
      component: () => import('../views/flotte/DepartsView.vue'), meta: dashboard },
    { path: '/flotte/sites', name: 'flotte-sites',
      component: () => import('../views/flotte/SitesView.vue'), meta: dashboard },
    { path: '/flotte/configuration', name: 'flotte-configuration',
      component: () => import('../views/flotte/ConfigurationView.vue'), meta: dashboard },

    /* ══ MODULE MAINTENANCE ══════════════════════════════════════
       Module 3 du cahier des charges, copié à la lettre de la structure
       du socle FMS (dossier views/maintenance), adapté au fret sec : pas de
       sous-système ni de compétence « citerne ». */
    { path: '/maintenance', name: 'maintenance-dashboard',
      component: () => import('../views/maintenance/MaintenanceDashboardView.vue'), meta: dashboard },
    { path: '/maintenance/ordres', name: 'maintenance-ordres',
      component: () => import('../views/maintenance/MaintenanceListView.vue'), meta: dashboard },
    { path: '/maintenance/plans', name: 'maintenance-plans',
      component: () => import('../views/maintenance/PlansEntretienView.vue'), meta: dashboard },
    { path: '/maintenance/atelier', name: 'maintenance-atelier',
      component: () => import('../views/maintenance/AtelierView.vue'), meta: dashboard },
    { path: '/maintenance/echeances', name: 'maintenance-echeances',
      component: () => import('../views/maintenance/EcheancesView.vue'), meta: dashboard },
    { path: '/maintenance/indisponibilites', name: 'maintenance-indisponibilites',
      component: () => import('../views/maintenance/IndisponibilitesView.vue'), meta: dashboard },
    { path: '/maintenance/equipe-mobile', name: 'maintenance-equipe-mobile',
      component: () => import('../views/maintenance/EquipeMobileView.vue'), meta: dashboard },
    { path: '/maintenance/fiabilite', name: 'maintenance-fiabilite',
      component: () => import('../views/maintenance/FiabiliteView.vue'), meta: dashboard },
    { path: '/maintenance/achats', name: 'maintenance-achats',
      component: () => import('../views/maintenance/AchatsStockView.vue'), meta: dashboard },
    { path: '/maintenance/parametres', name: 'maintenance-parametres',
      component: () => import('../views/maintenance/ParametresAtelierView.vue'), meta: dashboard },

    /* ══ ESPACE PERSONNEL (conducteur, aide conducteur) ══════════ */
    { path: '/mon-espace', name: 'espace-accueil',
      component: () => import('../views/espace/EspaceAccueilView.vue'), meta: dashboard },
    { path: '/mon-espace/absences', name: 'espace-absences',
      component: () => import('../views/espace/MesAbsencesView.vue'), meta: dashboard },
    { path: '/mon-profil', name: 'mon-profil',
      component: () => import('../views/espace/MonProfilView.vue'), meta: dashboard },

    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(to => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.connecte) return { name: 'login' }

  if (to.name === 'login' && auth.connecte) {
    return auth.cotéGestion ? { name: 'admin-tableau-bord' } : { name: 'espace-accueil' }
  }

  /* Le personnel roulant ne voit que son espace. */
  if (auth.connecte && auth.cotéTerrain) {
    const autorise = ['espace-accueil', 'espace-absences', 'mon-profil']
    if (!autorise.includes(String(to.name))) return { name: 'espace-accueil' }
  }

  /* À l'inverse, le côté gestion n'a rien à faire dans l'espace terrain. */
  if (auth.connecte && auth.cotéGestion && String(to.name).startsWith('espace-')) {
    return { name: 'admin-tableau-bord' }
  }
})

export default router
