/**
 * Proposition automatique de chargement, quelle que soit la marchandise.
 *
 * Fonction pure : à partir des commandes en attente et des véhicules
 * disponibles (déjà filtrés selon les règles de la planification : en règle,
 * non engagés, attelés, capacité connue), elle répartit les commandes entre
 * les véhicules selon leur destination (même région d'abord, puis
 * proximité), leur poids et leur volume, sans jamais dépasser la capacité
 * d'un véhicule. Les contraintes de livraison configurées s'appliquent par
 * le contrôle optionnel `controle`.
 */

export interface CommandeACharger {
  id: string
  libelle: string
  poidsKg: number
  volumeM3?: number
  lat: number
  lng: number
  region?: string
}

export interface VehiculeDisponible {
  id: string
  libelle: string
  capaciteKg: number
  /** Absent : volume utile inconnu, seul le poids limite le chargement. */
  capaciteM3?: number
  /** Point de départ du véhicule (sa base), pour ordonner ses livraisons. */
  lat?: number
  lng?: number
}

/** Contrainte de livraison (compatibilité des produits, exigences sur le
 *  véhicule) : `chargees` donne les commandes déjà retenues pour ce véhicule. */
export type ControleLivraison<C extends CommandeACharger = CommandeACharger, V extends VehiculeDisponible = VehiculeDisponible> =
  (commande: C, vehicule: V, chargees: C[]) => { ok: boolean; motif?: string }

export interface ChargementPropose<C extends CommandeACharger, V extends VehiculeDisponible> {
  vehicule: V
  /** Dans l'ordre de livraison proposé, au départ de la base du véhicule. */
  commandes: C[]
  poidsKg: number
  volumeM3: number
  tauxPoids: number
  tauxVolume?: number
}

export interface CommandeNonPlacee<C extends CommandeACharger> { commande: C; raison: string }

export interface PropositionChargement<C extends CommandeACharger, V extends VehiculeDisponible> {
  chargements: ChargementPropose<C, V>[]
  nonPlacees: CommandeNonPlacee<C>[]
}

/** Distance approchée en kilomètres entre deux points. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad)
  const y = (b.lat - a.lat) * rad
  return Math.sqrt(x * x + y * y) * 6371
}

const poids = (c: CommandeACharger) => c.poidsKg
const volume = (c: CommandeACharger) => c.volumeM3 ?? 0

/** Poids et volume d'une liste de commandes. */
export function chargeDe(commandes: CommandeACharger[]) {
  return { poidsKg: commandes.reduce((s, c) => s + poids(c), 0), volumeM3: commandes.reduce((s, c) => s + volume(c), 0) }
}

/** La commande tient-elle dans ce véhicule, en plus de celles déjà retenues ? */
export function placePour<C extends CommandeACharger, V extends VehiculeDisponible>(
  commande: C, vehicule: V, chargees: C[], controle?: ControleLivraison<C, V>,
): { ok: boolean; motif?: string } {
  const charge = chargeDe(chargees)
  if (charge.poidsKg + poids(commande) > vehicule.capaciteKg)
    return { ok: false, motif: `${vehicule.libelle} ne peut plus prendre ${poids(commande).toLocaleString('fr-FR')} kg : ${charge.poidsKg.toLocaleString('fr-FR')} kg déjà chargés sur ${vehicule.capaciteKg.toLocaleString('fr-FR')} kg.` }
  if (vehicule.capaciteM3 != null && charge.volumeM3 + volume(commande) > vehicule.capaciteM3)
    return { ok: false, motif: `${vehicule.libelle} ne peut plus prendre ${volume(commande).toLocaleString('fr-FR')} m³ : ${charge.volumeM3.toLocaleString('fr-FR')} m³ déjà chargés sur ${vehicule.capaciteM3.toLocaleString('fr-FR')} m³.` }
  if (controle) {
    const r = controle(commande, vehicule, chargees)
    if (!r.ok) return { ok: false, motif: r.motif ?? `${commande.libelle} ne peut pas être chargée sur ${vehicule.libelle}.` }
  }
  return { ok: true }
}

/** Ordre de livraison : du départ, chaque fois vers la commande restante la plus proche. */
export function ordonnerLivraisons<C extends CommandeACharger>(commandes: C[], depart?: { lat: number; lng: number }): C[] {
  if (commandes.length < 2) return [...commandes]
  let pos = depart ?? { lat: commandes[0]!.lat, lng: commandes[0]!.lng }
  const restantes = [...commandes]
  const out: C[] = []
  while (restantes.length) {
    let iMin = 0, dMin = Infinity
    restantes.forEach((c, i) => { const d = distanceKm(pos, c); if (d < dMin) { dMin = d; iMin = i } })
    const [suivante] = restantes.splice(iMin, 1)
    out.push(suivante!)
    pos = suivante!
  }
  return out
}

/** Recalcule poids, volume, taux de remplissage et ordre de livraison d'un véhicule. */
export function decrireChargement<C extends CommandeACharger, V extends VehiculeDisponible>(vehicule: V, commandes: C[]): ChargementPropose<C, V> {
  const depart = vehicule.lat != null && vehicule.lng != null ? { lat: vehicule.lat, lng: vehicule.lng } : undefined
  const charge = chargeDe(commandes)
  return {
    vehicule, commandes: ordonnerLivraisons(commandes, depart),
    poidsKg: charge.poidsKg, volumeM3: charge.volumeM3,
    tauxPoids: vehicule.capaciteKg ? Math.round(charge.poidsKg / vehicule.capaciteKg * 100) : 0,
    tauxVolume: vehicule.capaciteM3 ? Math.round(charge.volumeM3 / vehicule.capaciteM3 * 100) : undefined,
  }
}

function centre(commandes: CommandeACharger[]) {
  return { lat: commandes.reduce((s, c) => s + c.lat, 0) / commandes.length, lng: commandes.reduce((s, c) => s + c.lng, 0) / commandes.length }
}

/** Raison pour laquelle une commande ne peut aller dans aucun véhicule, même vide ; null si au moins un peut la prendre.
 *  « taille » : elle est seulement trop lourde ou trop volumineuse, et peut donc se répartir en parts. */
function raisonImpossible<C extends CommandeACharger, V extends VehiculeDisponible>(c: C, vehicules: V[], controle?: ControleLivraison<C, V>): { raison: string; taille?: boolean } | null {
  if (!(poids(c) > 0)) return { raison: "Poids non renseigné : impossible de choisir un véhicule." }
  if (volume(c) < 0) return { raison: 'Volume négatif : à corriger sur la demande.' }
  if (!vehicules.length) return { raison: 'Aucun véhicule disponible.' }
  const maxKg = Math.max(...vehicules.map(v => v.capaciteKg))
  if (poids(c) > maxKg) return { raison: `Trop lourde (${poids(c).toLocaleString('fr-FR')} kg) pour tous les véhicules disponibles : la plus grande capacité est de ${maxKg.toLocaleString('fr-FR')} kg.`, taille: true }
  const assezGrands = vehicules.filter(v => poids(c) <= v.capaciteKg && (v.capaciteM3 == null || volume(c) <= v.capaciteM3))
  if (!assezGrands.length) return { raison: `Trop volumineuse (${volume(c).toLocaleString('fr-FR')} m³) pour tous les véhicules disponibles.`, taille: true }
  if (controle) {
    const refus = assezGrands.map(v => controle(c, v, [])).filter(r => !r.ok)
    if (refus.length === assezGrands.length) return { raison: refus[0]?.motif ?? 'Aucun véhicule disponible ne répond aux contraintes de livraison.' }
  }
  return null
}

/** Découpe d'une commande : la partie qui tient dans la place restante, et le reste. null si aucune partie utile ne tient. */
export type DecoupeCommande<C extends CommandeACharger> = (commande: C, poidsMaxKg: number, volumeMaxM3?: number) => { prise: C; reste: C } | null

/** Place restante d'un véhicule, compte tenu des commandes déjà retenues. */
export function placeRestante(vehicule: VehiculeDisponible, chargees: CommandeACharger[]) {
  const ch = chargeDe(chargees)
  return { poidsKg: vehicule.capaciteKg - ch.poidsKg, volumeM3: vehicule.capaciteM3 != null ? vehicule.capaciteM3 - ch.volumeM3 : undefined }
}

export function proposerChargement<C extends CommandeACharger, V extends VehiculeDisponible>(
  commandes: C[], vehicules: V[], options: { controle?: ControleLivraison<C, V>; decouper?: DecoupeCommande<C> } = {},
): PropositionChargement<C, V> {
  const { controle, decouper } = options
  const nonPlacees: CommandeNonPlacee<C>[] = []
  const aPlacer: C[] = []
  /* Trop lourdes ou trop volumineuses pour tout véhicule : réparties en parts à la fin, si la découpe est permise. */
  const aDecouper: { commande: C; raison: string }[] = []
  commandes.forEach(c => {
    const r = raisonImpossible(c, vehicules, controle)
    if (!r) aPlacer.push(c)
    else if (r.taille && decouper) aDecouper.push({ commande: c, raison: r.raison })
    else nonPlacees.push({ commande: c, raison: r.raison })
  })

  const charges = new Map<string, C[]>()
  const libres = [...vehicules].sort((a, b) => b.capaciteKg - a.capaciteKg)

  /* 1. Une région (sinon un voisinage) par véhicule : les régions les plus
        chargées d'abord, chacune sur le plus petit véhicule qui la prend
        entière, à défaut sur le plus grand libre. */
  const parRegion = new Map<string, C[]>()
  aPlacer.forEach(c => { const k = c.region ?? ''; parRegion.set(k, [...(parRegion.get(k) ?? []), c]) })
  const groupes = [...parRegion.values()].sort((a, b) => chargeDe(b).poidsKg - chargeDe(a).poidsKg)
  const restantes: C[] = []
  for (const groupe of groupes) {
    let reste = [...groupe].sort((a, b) => poids(b) - poids(a))
    while (reste.length && libres.length) {
      const total = chargeDe(reste)
      /* Véhicules libres capables de prendre au moins une commande du groupe. */
      const utiles = libres.filter(v => reste.some(c => placePour(c, v, [], controle).ok))
      if (!utiles.length) break
      const entiers = utiles.filter(v => v.capaciteKg >= total.poidsKg && (v.capaciteM3 == null || v.capaciteM3 >= total.volumeM3))
      const v = entiers.length ? entiers[entiers.length - 1]! : utiles[0]!
      const chargees: C[] = []
      /* La plus lourde d'abord, puis chaque fois la plus proche de ce qui est déjà chargé. */
      let candidates = [...reste]
      while (candidates.length) {
        const ref = chargees.length ? centre(chargees) : null
        const ordre = ref ? [...candidates].sort((a, b) => distanceKm(ref, a) - distanceKm(ref, b)) : candidates
        const choisie = ordre.find(c => placePour(c, v, chargees, controle).ok)
        if (!choisie) break
        chargees.push(choisie)
        candidates = candidates.filter(c => c !== choisie)
      }
      charges.set(v.id, chargees)
      libres.splice(libres.indexOf(v), 1)
      reste = reste.filter(c => !chargees.includes(c))
    }
    restantes.push(...reste)
  }

  /* 2. Ce qui reste va dans les véhicules qui ont encore de la place, le plus proche d'abord. */
  const sansPlace: C[] = []
  for (const c of restantes.sort((a, b) => poids(b) - poids(a))) {
    const options2 = vehicules
      .filter(v => charges.has(v.id) && placePour(c, v, charges.get(v.id)!, controle).ok)
      .sort((a, b) => distanceKm(centre(charges.get(a.id)!), c) - distanceKm(centre(charges.get(b.id)!), c))
    const v = options2[0]
    if (v) charges.get(v.id)!.push(c)
    else sansPlace.push(c)
  }
  /* 3. Ce qui ne tient nulle part entier se répartit en parts, seulement si nécessaire :
        chaque part remplit la place restante d'un véhicule, la plus grande d'abord. */
  const aRepartir = [...aDecouper, ...sansPlace.map(c => ({ commande: c, raison: 'Plus de place dans les véhicules disponibles.' }))]
  for (const { commande, raison } of aRepartir) {
    if (!decouper) { nonPlacees.push({ commande, raison }); continue }
    let courante: C | null = commande
    let essais = vehicules.length
    while (courante && essais-- > 0) {
      const ordre = [...vehicules].sort((a, b) => placeRestante(b, charges.get(b.id) ?? []).poidsKg - placeRestante(a, charges.get(a.id) ?? []).poidsKg)
      let place = false
      for (const v of ordre) {
        const chargees = charges.get(v.id) ?? []
        if (placePour(courante, v, chargees, controle).ok) { charges.set(v.id, [...chargees, courante]); courante = null; place = true; break }
        const reste = placeRestante(v, chargees)
        if (reste.poidsKg <= 0 || (reste.volumeM3 != null && reste.volumeM3 <= 0)) continue
        const d = decouper(courante, reste.poidsKg, reste.volumeM3)
        if (!d || !placePour(d.prise, v, chargees, controle).ok) continue
        charges.set(v.id, [...chargees, d.prise]); courante = d.reste; place = true
        break
      }
      if (!place) break
    }
    if (courante) nonPlacees.push({ commande: courante, raison: courante === commande ? raison : 'Reste de la commande : plus de place dans les véhicules disponibles.' })
  }

  const chargements = vehicules.filter(v => charges.get(v.id)?.length).map(v => decrireChargement(v, charges.get(v.id)!))
  return { chargements, nonPlacees }
}

/* ══════════════════════════════════════════════════════════
   Carburant : proposition compartiment par compartiment.
   Chaque compartiment reçoit un seul produit et un seul client. Une commande
   part d'abord entière avec un seul camion, sur un ou plusieurs de ses
   compartiments ; elle ne se répartit sur plusieurs camions que si aucun ne
   peut la prendre seul. Compatibilité des produits (ensemble et succession
   sans nettoyage) et pompe exigée sont respectées ; parmi les camions
   possibles, celui qui laisse le moins de place perdue est retenu.
   ══════════════════════════════════════════════════════════ */
export interface CommandeCarburant { id: string; client: string; produit: string; volumeL: number; pompeExigee: boolean }
export interface CamionCompartiments {
  id: string
  libelle: string
  pompe: boolean
  /** Compartiments libres : numéro, capacité et produit précédent (pour la succession). */
  compartiments: { numero: number; capaciteL: number; precedent?: string }[]
}
export interface ReglesProduits {
  /** Deux produits peuvent-ils voyager dans le même camion ? */
  ensemble: (a: string, b: string) => boolean
  /** Le produit suivant peut-il être chargé dans un compartiment qui contenait le précédent ? */
  succession: (precedent: string | undefined, suivant: string) => boolean
}
export interface CompartimentAffecte { camionId: string; numero: number; produit: string; volumeL: number; commandeId: string; client: string }

/** Compartiments retenus pour un volume : un seul s'il suffit (le plus juste), sinon les plus grands jusqu'à couvrir le volume. */
function choisirCompartiments(libres: { numero: number; capaciteL: number }[], volume: number): { numero: number; capaciteL: number }[] | null {
  const seul = [...libres].filter(c => c.capaciteL >= volume).sort((a, b) => a.capaciteL - b.capaciteL)[0]
  if (seul) return [seul]
  const tries = [...libres].sort((a, b) => b.capaciteL - a.capaciteL)
  const pris: { numero: number; capaciteL: number }[] = []
  let total = 0
  for (const c of tries) { if (total >= volume) break; pris.push(c); total += c.capaciteL }
  return total >= volume ? pris : null
}

export function proposerPlanCompartiments(commandes: CommandeCarburant[], camions: CamionCompartiments[], regles: ReglesProduits): {
  affectations: CompartimentAffecte[]; nonPlacees: { commande: CommandeCarburant; raison: string }[]
} {
  const libres = new Map(camions.map(c => [c.id, [...c.compartiments]]))
  const produitsCamion = new Map(camions.map(c => [c.id, [] as string[]]))
  const affectations: CompartimentAffecte[] = []
  const nonPlacees: { commande: CommandeCarburant; raison: string }[] = []
  /* Les commandes à pompe d'abord (moins de camions possibles), puis les plus gros volumes. */
  const ordre = [...commandes].filter(c => c.volumeL > 0).sort((a, b) => Number(b.pompeExigee) - Number(a.pompeExigee) || b.volumeL - a.volumeL)
  for (const c of ordre) {
    let meilleur: { camion: CamionCompartiments; pris: { numero: number; capaciteL: number }[]; perte: number } | null = null
    let raison = `Aucun compartiment libre ne peut recevoir ${c.volumeL.toLocaleString('fr-FR')} L de ${c.produit}.`
    for (const camion of camions) {
      if (c.pompeExigee && !camion.pompe) { if (!camions.some(x => x.pompe)) raison = "La commande exige un camion équipé d'une pompe : aucun camion de la tournée n'en a."; continue }
      const deja = produitsCamion.get(camion.id)!
      if (deja.some(p => p !== c.produit && !regles.ensemble(p, c.produit))) { raison = `${c.produit} ne peut pas voyager avec les produits déjà chargés.`; continue }
      const utilisables = libres.get(camion.id)!.filter(x => regles.succession(x.precedent, c.produit))
      const pris = choisirCompartiments(utilisables, c.volumeL)
      if (!pris) continue
      const perte = pris.reduce((s, x) => s + x.capaciteL, 0) - c.volumeL
      if (!meilleur || perte < meilleur.perte || (perte === meilleur.perte && deja.length > produitsCamion.get(meilleur.camion.id)!.length)) meilleur = { camion, pris, perte }
    }
    if (!meilleur) {
      /* Aucun camion ne la prend seul : elle se répartit sur plusieurs camions, les plus grands d'abord. */
      const candidats = camions
        .filter(camion => !(c.pompeExigee && !camion.pompe) && !produitsCamion.get(camion.id)!.some(p => p !== c.produit && !regles.ensemble(p, c.produit)))
        .map(camion => ({ camion, utilisables: libres.get(camion.id)!.filter(x => regles.succession(x.precedent, c.produit)) }))
        .filter(x => x.utilisables.length)
        .sort((a, b) => b.utilisables.reduce((t, x) => t + x.capaciteL, 0) - a.utilisables.reduce((t, x) => t + x.capaciteL, 0))
      const disponible = candidats.reduce((t, x) => t + x.utilisables.reduce((u, y) => u + y.capaciteL, 0), 0)
      if (candidats.length < 2 || disponible < c.volumeL) { nonPlacees.push({ commande: c, raison }); continue }
      let resteR = c.volumeL
      for (const { camion, utilisables } of candidats) {
        if (resteR <= 0) break
        const pris = choisirCompartiments(utilisables, resteR) ?? [...utilisables].sort((a, b) => b.capaciteL - a.capaciteL)
        for (const x of pris) {
          if (resteR <= 0) break
          const v = Math.min(x.capaciteL, resteR)
          resteR -= v
          affectations.push({ camionId: camion.id, numero: x.numero, produit: c.produit, volumeL: v, commandeId: c.id, client: c.client })
          libres.set(camion.id, libres.get(camion.id)!.filter(y => y !== x))
        }
        produitsCamion.get(camion.id)!.push(c.produit)
      }
      continue
    }
    let reste = c.volumeL
    for (const x of meilleur.pris) {
      const v = Math.min(x.capaciteL, reste)
      reste -= v
      affectations.push({ camionId: meilleur.camion.id, numero: x.numero, produit: c.produit, volumeL: v, commandeId: c.id, client: c.client })
    }
    libres.set(meilleur.camion.id, libres.get(meilleur.camion.id)!.filter(x => !meilleur!.pris.includes(x)))
    produitsCamion.get(meilleur.camion.id)!.push(c.produit)
  }
  return { affectations, nonPlacees }
}
