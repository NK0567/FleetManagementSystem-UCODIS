import type { FileMeta } from '@/types/file.types'
import { ALLOWED_FILE_TYPES, MAX_FILE_BYTES, fileIssue } from '@/utils/fileRules'
import type { MockDatabase } from '../db/database'
import { nextNo } from '../db/numbering'
import { routeParam, stampCreated } from '../http/crudResource'
import { badRequest, notFound, unprocessable } from '../http/errors'
import { created, file } from '../http/responses'
import type { MockRouter } from '../http/router'
import { COMMON_MESSAGES } from '../i18n'

const MEGABYTE = 1024 * 1024

export function fileMetaOf(db: MockDatabase, no: string): FileMeta | null {
  const row = db.files.find(no)
  return row
    ? {
        no: row.no,
        name: row.name,
        mimeType: row.mimeType,
        size: row.size,
        uploadedAt: row.createdAt,
        uploadedBy: row.createdBy
      }
    : null
}

export function filesMetaOf(db: MockDatabase, nos: readonly string[]): FileMeta[] {
  return nos.map((no) => fileMetaOf(db, no)).filter((meta): meta is FileMeta => meta !== null)
}

/** Deletes files a record no longer points to. */
export async function releaseFiles(db: MockDatabase, nos: readonly string[]): Promise<void> {
  for (const no of nos) {
    if (db.files.exists(no)) db.files.remove(no)
    await db.fileStore.remove(no)
  }
}

/** Upload and download of the files attached to records; any signed-in user may upload. */
export function registerFileHandlers(router: MockRouter, db: MockDatabase): void {
  router.post('/files', {}, async (request) => {
    const form = request.body
    const upload = form instanceof FormData ? form.get('file') : null
    if (!(upload instanceof Blob)) throw badRequest(COMMON_MESSAGES.fileMissing)
    const issue = fileIssue(upload, ALLOWED_FILE_TYPES)
    if (issue === 'type') throw unprocessable(COMMON_MESSAGES.fileType)
    if (issue === 'size')
      throw unprocessable(COMMON_MESSAGES.fileSize, { max: MAX_FILE_BYTES / MEGABYTE })
    if (issue === 'empty') throw unprocessable(COMMON_MESSAGES.fileEmpty)

    const no = nextNo(
      db.files.all().map((row) => row.no),
      'FIL-',
      6
    )
    const name = upload instanceof File && upload.name ? upload.name : no
    await db.fileStore.put(no, upload)
    db.files.insert(stampCreated({ no, name, mimeType: upload.type, size: upload.size }, request))
    return created(fileMetaOf(db, no))
  })

  router.get('/files/:no', {}, async (request) => {
    const row = db.files.findOrFail(routeParam(request, 'no'))
    const blob = await db.fileStore.get(row.no)
    if (!blob) throw notFound()
    return file(new Blob([blob], { type: row.mimeType }), row.name)
  })
}
