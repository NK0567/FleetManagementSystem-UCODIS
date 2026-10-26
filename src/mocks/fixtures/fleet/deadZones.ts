import type { GeoCircle } from '@/utils/geo'

/** Stretches of road without mobile coverage: the on-board units cannot report from there. */
export const DEAD_ZONES: readonly (GeoCircle & { name: string })[] = [
  { name: 'Beforona (RN2)', latitude: -18.8133, longitude: 48.4058, radiusM: 25_000 }
]
