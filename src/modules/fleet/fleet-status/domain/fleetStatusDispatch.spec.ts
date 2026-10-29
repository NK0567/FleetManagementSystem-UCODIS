import { describe, expect, it } from 'vitest'
import { isValidEmailAddress, parseRecipients } from './fleetStatusDispatch'

describe('fleet status recipients', () => {
  it('split the typed addresses and drop the duplicates', () => {
    expect(parseRecipients('direction@ucodis.mg; Client@exemple.com, direction@ucodis.mg')).toEqual(
      ['direction@ucodis.mg', 'client@exemple.com']
    )
    expect(parseRecipients('  ')).toEqual([])
  })

  it('refuse an address that is not one', () => {
    expect(isValidEmailAddress('direction@ucodis.mg')).toBe(true)
    expect(isValidEmailAddress('direction')).toBe(false)
  })
})
