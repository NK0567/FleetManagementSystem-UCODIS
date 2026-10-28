import { beforeEach, describe, expect, it } from 'vitest'
import type { FileMeta } from '@/types/file.types'
import type { VehicleApi } from '@/modules/fleet/vehicles/types/vehicle.types'
import { call, createTestServer } from '../testing'
import type { MockServer } from '../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

function upload(content: string, name: string, type: string) {
  const form = new FormData()
  form.append('file', new File([content], name, { type }))
  return call(server, 'post', '/files', { as: 'FLT001', body: form })
}

describe('files', () => {
  it('stores an allowed file and serves it back with its type', async () => {
    const response = await upload('%PDF-1.4 demo', 'carte-grise.pdf', 'application/pdf')
    expect(response.status).toBe(201)
    const meta = response.data.data as FileMeta
    expect(meta).toMatchObject({ no: 'FIL-000001', name: 'carte-grise.pdf', uploadedBy: 'FLT001' })

    const download = await call(server, 'get', `/files/${meta.no}`, { as: 'FLT001' })
    const blob = download.data as unknown as Blob
    expect(blob.type).toBe('application/pdf')
    expect(await blob.text()).toBe('%PDF-1.4 demo')
  })

  it('refuses a file a browser could run, whatever its name', async () => {
    const response = await upload('<script>alert(1)</script>', 'photo.jpg', 'text/html')
    expect(response.status).toBe(422)
  })

  it('needs a signed-in user', async () => {
    const response = await call(server, 'post', '/files', { body: new FormData() })
    expect(response.status).toBe(401)
  })
})

describe('vehicle photos', () => {
  it('attaches an image and deletes the file when the photo is removed', async () => {
    const photo = (await upload('jpeg', 'face.jpg', 'image/jpeg')).data.data as FileMeta
    const added = await call(server, 'post', '/fleet/vehicles/VEH-001/photos', {
      as: 'FLT001',
      body: { fileNo: photo.no }
    })
    expect((added.data.data as VehicleApi).photos.map((item) => item.no)).toEqual([photo.no])

    await call(server, 'delete', `/fleet/vehicles/VEH-001/photos/${photo.no}`, { as: 'FLT001' })
    expect(server.db.files.exists(photo.no)).toBe(false)
    expect((await call(server, 'get', `/files/${photo.no}`, { as: 'FLT001' })).status).toBe(404)
  })

  it('refuses a PDF as a photo', async () => {
    const pdf = (await upload('%PDF', 'doc.pdf', 'application/pdf')).data.data as FileMeta
    const response = await call(server, 'post', '/fleet/vehicles/VEH-001/photos', {
      as: 'FLT001',
      body: { fileNo: pdf.no }
    })
    expect(response.status).toBe(400)
  })
})
