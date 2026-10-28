import { CalendarOff, ClipboardCheck, House, Route } from '@lucide/vue'
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
      {
        labelKey: 'nav.myProfile',
        to: '/me',
        group: 'nav.group.mySpace',
        icon: House,
        menuKey: 'mySpace'
      },
      {
        labelKey: 'nav.myTour',
        to: '/me/tour',
        group: 'nav.group.mySpace',
        icon: Route,
        menuKey: 'mySpace'
      },
      {
        labelKey: 'nav.myChecklist',
        to: '/me/checklist',
        group: 'nav.group.mySpace',
        icon: ClipboardCheck,
        menuKey: 'mySpace'
      },
      {
        labelKey: 'nav.myAbsences',
        to: '/me/absences',
        group: 'nav.group.mySpace',
        icon: CalendarOff,
        menuKey: 'mySpace'
      }
    ]
  })
}
