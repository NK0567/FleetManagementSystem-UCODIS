/**
 * Calculs géographiques simples, suffisants à l'échelle d'un trajet routier :
 * distance entre deux points, distance d'un point à un tracé, zone de
 * géorepérage circulaire autour d'un site.
 */
export interface PointGeo { lat: number; lng: number }

const R = 6_371_000

/** Distance en mètres entre deux points (formule de haversine). */
export function distanceM(a: PointGeo, b: PointGeo): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Distance en mètres d'un point au segment [a, b], en projection locale. */
function distanceSegmentM(p: PointGeo, a: PointGeo, b: PointGeo): number {
  const rad = Math.PI / 180
  const k = Math.cos(p.lat * rad)
  const ax = (a.lng - p.lng) * k, ay = a.lat - p.lat
  const bx = (b.lng - p.lng) * k, by = b.lat - p.lat
  const dx = bx - ax, dy = by - ay
  const l2 = dx * dx + dy * dy
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2))
  const x = ax + t * dx, y = ay + t * dy
  return Math.sqrt(x * x + y * y) * rad * R
}

/** Distance en mètres d'un point au tracé le plus proche. Un tracé vide renvoie l'infini. */
export function distanceTraceM(p: PointGeo, trace: PointGeo[]): number {
  if (!trace.length) return Infinity
  if (trace.length === 1) return distanceM(p, trace[0]!)
  let min = Infinity
  for (let i = 0; i < trace.length - 1; i++) min = Math.min(min, distanceSegmentM(p, trace[i]!, trace[i + 1]!))
  return min
}

export interface ZoneSite extends PointGeo { id: string; nom: string; type: string; rayonM?: number; actif: boolean }

/** Site actif dont la zone contient le point ; le plus proche si plusieurs zones se chevauchent. */
export function siteContenant<T extends ZoneSite>(p: PointGeo, sites: T[], rayonDefautM: number): T | null {
  let meilleur: T | null = null
  let dMin = Infinity
  for (const s of sites) {
    if (!s.actif) continue
    const d = distanceM(p, s)
    if (d <= (s.rayonM ?? rayonDefautM) && d < dMin) { meilleur = s; dMin = d }
  }
  return meilleur
}

/** Libellé de lieu lisible : le site si le point est dans sa zone, sinon la distance au site le plus proche. */
export function lieuLisible<T extends ZoneSite>(p: PointGeo, sites: T[], rayonDefautM: number): string {
  const dans = siteContenant(p, sites, rayonDefautM)
  if (dans) return dans.nom
  let proche: T | null = null
  let dMin = Infinity
  for (const s of sites) { const d = distanceM(p, s); if (d < dMin) { dMin = d; proche = s } }
  return proche ? `À ${Math.round(dMin / 1000)} km de ${proche.nom}` : `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`
}
