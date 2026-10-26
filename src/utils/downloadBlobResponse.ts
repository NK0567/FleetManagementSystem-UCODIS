import type { AxiosResponse } from 'axios'

export class EmptyExportError extends Error {
  constructor() {
    super('The export returned an empty file')
    this.name = 'EmptyExportError'
  }
}

function fileNameFromContentDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim())
    } catch {
      return encoded.trim()
    }
  }
  return /filename="([^"]+)"/i.exec(header)?.[1]?.trim() ?? null
}

/** Saves a file returned by the API (Excel export...) under the name it announces. */
export function downloadBlobResponse(
  response: AxiosResponse<Blob>,
  fallbackFileName: string
): void {
  const blob = response.data
  if (!(blob instanceof Blob) || blob.size === 0) throw new EmptyExportError()
  const fileName =
    fileNameFromContentDisposition(response.headers['content-disposition']) ??
    `${fallbackFileName}.xlsx`
  saveBlob(blob, fileName)
}

/** Hands a file built in the browser to the user. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
