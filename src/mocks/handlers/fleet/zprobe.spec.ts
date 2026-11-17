import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { call, createTestServer } from '../../testing'
it('probe', async () => {
  const server = createTestServer()
  const d = await call(server, 'get', '/fleet/live/positions', { as: 'FLT001', query: {}, language: 'fr' })
  writeFileSync('/tmp/probe_pos.json', JSON.stringify(d.data.data.map((p: any) => [p.plate, p.situation, p.latitude, p.longitude, p.lat, p.lng])))
})
