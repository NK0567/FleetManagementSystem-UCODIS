import { describe, expect, it } from 'vitest'
import {
  buildFilterFieldsFromColumns,
  inferCommonFilterMeta,
  overridesFromFilterDefs
} from './buildFilterFieldsFromColumns'

describe('inferCommonFilterMeta', () => {
  it('recognizes booleans, dates and counts from the field name', () => {
    expect(inferCommonFilterMeta('isActive')).toEqual({ valueType: 'boolean', kind: 'boolean' })
    expect(inferCommonFilterMeta('startDate')).toEqual({ valueType: 'date', kind: 'date' })
    expect(inferCommonFilterMeta('submittedAt')).toEqual({ valueType: 'date', kind: 'date' })
    expect(inferCommonFilterMeta('days')).toEqual({ valueType: 'number', kind: 'number' })
    expect(inferCommonFilterMeta('actualHeadcount')).toEqual({
      valueType: 'number',
      kind: 'number'
    })
  })

  it('treats anything else, statuses included, as text until overridden', () => {
    expect(inferCommonFilterMeta('status')).toEqual({ valueType: 'string', kind: 'text' })
  })
})

describe('buildFilterFieldsFromColumns', () => {
  it('maps every column to a filter field and applies overrides', () => {
    const fields = buildFilterFieldsFromColumns(
      [
        { sortKey: 'no', label: 'No.' },
        { sortKey: 'status', label: 'Status' },
        { sortKey: 'startDate', label: 'Start' }
      ],
      { status: { valueType: 'string', kind: 'option', optionsKey: 'leaveRequestStatus' } }
    )

    expect(fields.map(({ field, kind }) => [field, kind])).toEqual([
      ['no', 'text'],
      ['status', 'option'],
      ['startDate', 'date']
    ])
    expect(fields[1]).toMatchObject({ label: 'Status', optionsKey: 'leaveRequestStatus' })
  })

  it('appends extra fields that are not list columns, once', () => {
    const fields = buildFilterFieldsFromColumns(
      [{ sortKey: 'no', label: 'No.' }],
      {},
      inferCommonFilterMeta,
      [
        {
          field: 'orgUnitNo',
          labelKey: 'x',
          valueType: 'string',
          kind: 'reference',
          referenceKey: 'orgUnits'
        },
        { field: 'no', labelKey: 'y', valueType: 'string', kind: 'text' }
      ]
    )

    expect(fields.map((field) => field.field)).toEqual(['no', 'orgUnitNo'])
    expect(fields[1]).toMatchObject({ kind: 'reference', referenceKey: 'orgUnits' })
  })

  it('builds overrides from filter definitions without their label', () => {
    const overrides = overridesFromFilterDefs([
      {
        field: 'status',
        labelKey: 'status',
        label: 'Status',
        valueType: 'string',
        kind: 'option',
        optionsKey: 's'
      }
    ])
    expect(overrides.status).toEqual({
      labelKey: 'status',
      valueType: 'string',
      kind: 'option',
      optionsKey: 's'
    })
  })
})
