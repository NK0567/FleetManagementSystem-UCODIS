import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'
import { registerNavMenu } from '@/core/navigation/moduleRegistry'

const MY_SPACE_ORDER = 5

export function registerSelfServiceModule(): void {
  registerFeatureRoutes({
    MYSPACE: { to: '/me', menuKey: 'mySpace' }
  })

  registerNavMenu({
    labelKey: 'nav.mySpace',
    order: MY_SPACE_ORDER,
    subItems: [
      { labelKey: 'nav.myProfile', to: '/me', menuKey: 'mySpace' },
      { labelKey: 'nav.myTour', to: '/me/tour', menuKey: 'mySpace' },
      { labelKey: 'nav.myChecklist', to: '/me/checklist', menuKey: 'mySpace' },
      { labelKey: 'nav.myAbsences', to: '/me/absences', menuKey: 'mySpace' }
    ]
  })
}
