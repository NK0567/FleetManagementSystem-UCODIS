import { registerFeatureRoutes } from '@/core/navigation/featureRoutes'

/** Settings are reached from the gear icon of the top bar, not from the menu. */
export function registerSettingsModule(): void {
  registerFeatureRoutes({
    MODULETOGGLE: { to: '/settings/module-toggles', menuKey: 'moduleToggle' }
  })
}
