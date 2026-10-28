import { describe, expect, it } from 'vitest'
import { IMAGE_FILE_TYPES, MAX_FILE_BYTES, fileIssue } from './fileRules'

describe('fileIssue', () => {
  it('accepts a PDF or a photo within the size limit', () => {
    expect(fileIssue({ type: 'application/pdf', size: 1000 })).toBeNull()
    expect(fileIssue({ type: 'image/jpeg', size: MAX_FILE_BYTES })).toBeNull()
  })

  it('refuses any other type, even when renamed, and files too large or empty', () => {
    expect(fileIssue({ type: 'text/html', size: 10 })).toBe('type')
    expect(fileIssue({ type: 'image/svg+xml', size: 10 })).toBe('type')
    expect(fileIssue({ type: 'image/png', size: MAX_FILE_BYTES + 1 })).toBe('size')
    expect(fileIssue({ type: 'image/png', size: 0 })).toBe('empty')
  })

  it('narrows the accepted types when asked', () => {
    expect(fileIssue({ type: 'application/pdf', size: 10 }, IMAGE_FILE_TYPES)).toBe('type')
  })
})
