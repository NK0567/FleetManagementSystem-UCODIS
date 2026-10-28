/** A file kept by the server; records point to it by its number. */
export interface FileMeta {
  no: string
  name: string
  mimeType: string
  size: number
  uploadedAt: string
  uploadedBy: string
}
