import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'
import type { FileMeta } from '@/types/file.types'

export const fileApi = {
  /** Sent as multipart: with the JSON content type of the client, axios would serialize the form. */
  upload(file: File) {
    const form = new FormData()
    form.append('file', file)
    return httpClient.post<SingleResponse<FileMeta>>('/files', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  download(no: string) {
    return httpClient.get<Blob>(`/files/${encodeURIComponent(no)}`, { responseType: 'blob' })
  }
}
