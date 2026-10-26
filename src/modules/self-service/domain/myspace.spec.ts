import { describe, expect, it } from 'vitest'
import { mayDeclare } from './myspace'

describe('mayDeclare', () => {
  it('lets the driver declare and keeps the assistant read-only', () => {
    expect(mayDeclare('driver')).toBe(true)
    expect(mayDeclare('assistant')).toBe(false)
  })
})
