import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { USER_PROFILES } from '@/types/auth.types'
import { ROLE_MENUS } from '@/mocks/fixtures/auth/rolePermissions'
import { ROLE_GUIDES } from './guideContent'

const pageExists = (to: string) => {
  const base = resolve(__dirname, '../../pages', to.replace(/^\//, ''))
  const parent = resolve(base, '..')
  return (
    existsSync(`${base}.vue`) ||
    existsSync(resolve(base, 'index.vue')) ||
    existsSync(resolve(parent, '[view].vue'))
  )
}

describe('role guides', () => {
  it('gives every role a guide whose steps open an existing screen', () => {
    for (const profile of USER_PROFILES) {
      const guide = ROLE_GUIDES[profile]
      expect(guide.steps.length).toBeGreaterThan(0)
      for (const step of guide.steps) {
        if (step.to) expect(pageExists(step.to), `${profile} ${step.to}`).toBe(true)
        expect(step.title.fr && step.title.en).toBeTruthy()
        expect(`${step.title.fr}${step.detail.fr}`).not.toMatch(/[\u2013\u2014]/)
      }
    }
  })

  it('keeps each role in its own menus', () => {
    expect(ROLE_MENUS.CUSTOMER_SERVICE).toContain('CUSTOMERCONFIRMATION')
    expect(ROLE_GUIDES.CUSTOMER_SERVICE.steps.every((step) => !step.to?.startsWith('/fleet'))).toBe(
      true
    )
  })
})
