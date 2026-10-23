import type { CollectionDefinition, MockRow } from '../db/collection'

/** Description of a stored file; its content lives in the file store. */
export interface FileRow extends MockRow {
  name: string
  mimeType: string
  size: number
}

export const filesCollection: CollectionDefinition<FileRow> = {
  name: 'files',
  seed: () => []
}
