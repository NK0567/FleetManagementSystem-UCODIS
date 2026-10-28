import { describe, expect, it, vi } from 'vitest'
import {
  buildListAccessScopeFilters,
  mergeListAccessScopeFilters,
  resolveListAccessRestriction
} from './listAccessScope'
import type { UserPermissionRow } from '@/types/auth.types'

vi.mock('@/core/factories/viewAsFilters', () => ({
  currentUserCode: () => 'FLT001',
  currentUserOrgUnitNo: () => 'FLT'
}))

function row(partial: Partial<UserPermissionRow>): UserPermissionRow {
  return {
    feature: 'LEAVEREQUEST',
    insert: false,
    update: false,
    read: true,
    delete: false,
    execute: false,
    export: false,
    ...partial
  }
}

describe('resolveListAccessRestriction', () => {
  it('lets "my only" win over "my team"', () => {
    expect(resolveListAccessRestriction([row({ myOnly: true, myTeam: true })])).toBe('owner')
  })

  it('restricts to the team when only "my team" is set', () => {
    expect(resolveListAccessRestriction([row({ myTeam: true })])).toBe('team')
  })

  it('applies no restriction without flags', () => {
    expect(resolveListAccessRestriction([row({})])).toBeNull()
    expect(resolveListAccessRestriction([])).toBeNull()
  })
})

describe('buildListAccessScopeFilters', () => {
  it('filters on the owner field with the current user code', () => {
    expect(buildListAccessScopeFilters({ restriction: 'owner', ownerField: 'createdBy' })).toEqual([
      { field: 'createdBy', valueType: 'string', value: 'FLT001' }
    ])
  })

  it('filters on the team field with the current org unit', () => {
    expect(
      buildListAccessScopeFilters({
        restriction: 'team',
        ownerField: 'createdBy',
        teamField: 'orgUnitNo'
      })
    ).toEqual([{ field: 'orgUnitNo', valueType: 'string', value: 'FLT' }])
  })

  it('falls back to the owner when no team field is configured', () => {
    expect(buildListAccessScopeFilters({ restriction: 'team', ownerField: 'createdBy' })).toEqual([
      { field: 'createdBy', valueType: 'string', value: 'FLT001' }
    ])
  })

  it('accepts an explicit owner value', () => {
    expect(
      buildListAccessScopeFilters({
        restriction: 'owner',
        ownerField: 'employeeNo',
        ownerValue: 'UCT-010'
      })
    ).toEqual([{ field: 'employeeNo', valueType: 'string', value: 'UCT-010' }])
  })
})

describe('mergeListAccessScopeFilters', () => {
  it('keeps unrelated filters and adds the scope', () => {
    expect(
      mergeListAccessScopeFilters(
        [{ field: 'status', valueType: 'string', value: 'pending' }],
        [{ field: 'createdBy', valueType: 'string', value: 'FLT001' }]
      )
    ).toEqual([
      { field: 'status', valueType: 'string', value: 'pending' },
      { field: 'createdBy', valueType: 'string', value: 'FLT001' }
    ])
  })

  it('prevents replacing the owner with another code', () => {
    expect(
      mergeListAccessScopeFilters(
        [{ field: 'createdBy', valueType: 'string', value: 'OTHER' }],
        [{ field: 'createdBy', valueType: 'string', value: 'FLT001' }]
      )
    ).toEqual([{ field: 'createdBy', valueType: 'string', value: 'FLT001' }])
  })
})
