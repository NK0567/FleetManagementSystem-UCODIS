import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Commande, EnqueteOrdonnateur } from '../types'
import { aujourdhuiISO, maintenant } from '../utils/horloge'
import { useVoyagesStore } from './voyages'
import { useControlesTransportStore } from './controlesTransport'
import { useProduitsStore } from './produits'
import { COMMANDES_CARBURANT_DEMO } from './donneesCarburant'
import { useParametresPlanificationStore } from './parametresPlanification'
import { useAuthStore } from './auth'

/** Le point de départ n'est pas la création directe d'une tournée, mais des
 *  commandes individuelles, chacune associée à un destinataire, une adresse
 *  et un contenu : elles s'accumulent ici en attendant d'être regroupées en
 *  chargement. Persisté dans le navigateur comme le reste de la
 *  planification, pour rester partagé entre les onglets. */
export const useCommandesStore = defineStore('commandes', () => {
  const SEED: Commande[] = [
    {
      id: 'CMD-001', destinataire: 'Jumbo Score Antananarivo', adresseLivraison: 'Ankorondrano, Antananarivo',
      lat: -18.8792, lng: 47.5079, contenu: 'Produits alimentaires secs', poidsKg: 4200, volumeM3: 18,
      dateSouhaitee: '2026-10-02', statut: 'en_attente', createdAt: '2026-09-27T08:00:00',
      nombreUnites: 350, referenceExterne: 'BL-26-10421', emisPar: 'Lova Rabemananjara', emisParRole: 'commercial', origine: 'demande',
    },
    {
      id: 'CMD-002', destinataire: 'Shoprite Antsirabe', adresseLivraison: 'Route Circulaire, Antsirabe',
      lat: -19.8659, lng: 47.0333, contenu: 'Boissons', poidsKg: 6100, volumeM3: 22,
      dateSouhaitee: '2026-10-02', statut: 'en_attente', createdAt: '2026-09-27T09:15:00',
      nombreUnites: 510, referenceExterne: 'BL-26-10422', emisPar: 'Lova Rabemananjara', emisParRole: 'commercial', origine: 'demande',
    },
    {
      id: 'CMD-003', destinataire: 'Leader Price Toamasina', adresseLivraison: 'Boulevard Joffre, Toamasina',
      lat: -18.1492, lng: 49.4023, contenu: 'Produits ménagers', poidsKg: 3400, volumeM3: 14,
      dateSouhaitee: '2026-10-03', statut: 'en_attente', createdAt: '2026-09-27T10:30:00',
      nombreUnites: 280, referenceExterne: 'BL-26-10427', emisPar: 'Lova Rabemananjara', emisParRole: 'commercial', origine: 'demande',
    },
    /* Demande déjà livrée (ordre OT-2026-04430), avec la réponse de son ordonnateur à l'enquête. */
    {
      id: 'CMD-012', destinataire: 'Leader Price Antsirabe', adresseLivraison: 'Lot II M 12, Antsirabe',
      lat: -19.8667, lng: 47.0333, contenu: '40 cartons de produits alimentaires secs', produit: 'Produits alimentaires secs', poidsKg: 800,
      dateSouhaitee: '2026-09-01', statut: 'affectee', voyageId: 'VOY-012', createdAt: '2026-08-30T09:00:00',
      nombreUnites: 40, referenceExterne: 'BL-26-10388', emisPar: 'Lova Rabemananjara', emisParRole: 'commercial', origine: 'demande',
      enqueteOrdonnateur: { respectOrdre: 5, delais: 3, qualite: 4, commentaire: 'Livré complet, mais avec plus de trois heures de retard.', reponduLe: '2026-09-02T09:00:00', reponduPar: 'Lova Rabemananjara' },
    },
    ...COMMANDES_CARBURANT_DEMO.map(c => ({ ...c })),
  ]

  const CLE_STOCKAGE = 'fms-ucodis-commandes-v2'
  function chargerDepuisStockage(): Commande[] {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE)
      if (!brut) return SEED
      const parse = JSON.parse(brut)
      if (!Array.isArray(parse)) return SEED
      /* Commandes enregistrées avant l'arrivée des commandes de carburant de démonstration. */
      return [...parse, ...COMMANDES_CARBURANT_DEMO.filter(c => !parse.some((x: Commande) => x.id === c.id)).map(c => ({ ...c }))]
    } catch { return SEED }
  }

  const commandes = ref<Commande[]>(chargerDepuisStockage())
  function sauvegarder() {
    try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(commandes.value)) } catch { /* tant pis */ }
  }
  watch(commandes, sauvegarder, { deep: true })
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', e => {
      if (e.key === CLE_STOCKAGE && e.newValue) { try { commandes.value = JSON.parse(e.newValue) } catch { /* ignoré */ } }
    })
  }

  const enAttente = computed(() => commandes.value.filter(c => c.statut === 'en_attente'))
  /** Commande de carburant : son produit est un carburant du référentiel. */
  const estCarburant = (c: Commande) => !!useProduitsStore().resoudre(c.produit ?? c.contenu)?.carburant
  /** Commandes en attente hors carburant : le carburant se planifie en tournée de carburant, compartiment par compartiment. */
  const enAttenteFret = computed(() => enAttente.value.filter(c => !estCarburant(c)))
  /** Commandes de carburant livrées par camion, en attente d'une tournée ; l'enlèvement direct par le client ne passe pas par la planification. */
  const carburantAPlanifier = computed(() => enAttente.value.filter(c => estCarburant(c) && c.modeLivraison !== 'enlevement_client'))
  const getById = (id: string) => commandes.value.find(c => c.id === id)

  /* Numéro suivant le plus grand existant : jamais deux fois le même. */
  const idSuivant = () => `CMD-${String(commandes.value.reduce((m, c) => Math.max(m, Number(c.id.replace(/\D/g, '')) || 0), 0) + 1).padStart(3, '0')}`
  function creer(saisie: Omit<Commande, 'id' | 'statut' | 'createdAt'>) {
    const id = idSuivant()
    /* Qui paie le fret : précisé sur la commande, sinon le réglage par défaut. */
    const fret = saisie.fretALaCharge ?? useParametresPlanificationStore().parametres.fretALaChargeDefaut
    commandes.value.push({ ...saisie, fretALaCharge: fret, id, statut: 'en_attente', createdAt: aujourdhuiISO() })
    return id
  }

  /* ── Commande répartie en plusieurs parts ──
     Une commande qui n'entre pas dans un seul véhicule (ou que le planificateur
     veut partager) se répartit en parts : chaque part garde la même référence,
     a sa propre livraison, son lien de suivi, sa confirmation et son bon de
     livraison. La commande d'origine porte la première part ; les autres
     parts la citent (partDe). Deux parts toutes deux à livrer se regroupent. */
  const racine = (c: Commande) => c.partDe ?? c.id
  /** Toutes les parts de la commande (elle comprise), la commande d'origine d'abord. */
  function partsDe(id: string): Commande[] {
    const c = getById(id)
    if (!c) return []
    const r = racine(c)
    return commandes.value.filter(x => racine(x) === r).sort((a, b) => (a.id === r ? -1 : b.id === r ? 1 : a.id.localeCompare(b.id, 'fr', { numeric: true })))
  }
  /** Rang de la part parmi les parts encore actives (hors parts annulées) : « part 1 sur 2 » ; null pour une commande entière. */
  function rangPart(id: string): { rang: number; total: number } | null {
    const actives = partsDe(id).filter(x => x.statut !== 'annulee' || x.id === id)
    if (actives.length < 2) return null
    return { rang: actives.findIndex(x => x.id === id) + 1, total: actives.length }
  }
  const estRepartie = (id: string) => partsDe(id).length > 1
  const arrondi2 = (n: number) => Math.round(n * 100) / 100
  /** Contenu d'une part, recalculé sur sa quantité à partir du contenu de la commande entière :
   *  chaque article chiffré reçoit sa part, sinon la quantité de la part est précisée. */
  function contenuDeLaPart(c: Commande): string {
    const contenu = c.contenuInitial ?? c.contenu
    const unitesRef = c.unitesInitiales
    const poidsRef = c.poidsInitial ?? c.poidsKg
    if (unitesRef === c.nombreUnites && poidsRef === c.poidsKg) return contenu
    const articles = contenu.split(',').map(x => x.trim()).filter(Boolean)
    const NOMBRE = /^(\d+(?:[.,]\d+)?)(?=\s)/
    const nombres = articles.map(a => { const m = NOMBRE.exec(a); return m ? Number(m[1]!.replace(',', '.')) : null })
    if (nombres.some(n => n != null)) {
      const f = unitesRef && c.nombreUnites != null ? c.nombreUnites / unitesRef : poidsRef ? c.poidsKg / poidsRef : 1
      const chiffres = nombres.filter((n): n is number => n != null)
      const somme = chiffres.reduce((t, n) => t + n, 0)
      let parts: number[]
      if (c.nombreUnites != null && somme === unitesRef && chiffres.every(Number.isInteger)) {
        /* Répartition exacte : la somme des articles de la part est son nombre d'unités. */
        const bruts = chiffres.map(n => n * f)
        parts = bruts.map(Math.floor)
        let reste = c.nombreUnites - parts.reduce((t, n) => t + n, 0)
        bruts.map((b, i) => ({ i, r: b - Math.floor(b) })).sort((a, b) => b.r - a.r).forEach(({ i }) => { if (reste > 0) { parts[i]!++; reste-- } })
      } else parts = chiffres.map(n => Math.round(n * f * 100) / 100)
      let k = 0
      const out = articles.map((a, i) => {
        if (nombres[i] == null) return a
        const n = parts[k++]!
        return n > 0 ? a.replace(NOMBRE, String(n).replace('.', ',')) : ''
      }).filter(Boolean)
      return out.length ? out.join(', ') : contenu
    }
    const unite = useParametresPlanificationStore().parametres.uniteComptage
    return `${contenu} (${c.nombreUnites != null ? `${c.nombreUnites} ${unite}` : `${c.poidsKg.toLocaleString('fr-FR')} kg`})`
  }
  function recalculerContenu(c: Commande) {
    if (c.volumeL != null || c.contenuInitial == null) return
    c.contenu = contenuDeLaPart(c)
  }
  /** Détache d'une commande une nouvelle part (mêmes destinataire, référence et contenu) ; la commande garde le reste. */
  function detacher(id: string, q: { poidsKg: number; nombreUnites?: number; volumeL?: number }, statut: Commande['statut'] = 'en_attente', voyageId?: string): string {
    const c = getById(id)!
    /* Première répartition : la commande entière est gardée pour recalculer le contenu de chaque part. */
    if (c.contenuInitial == null) { c.contenuInitial = c.contenu; c.unitesInitiales = c.nombreUnites; c.poidsInitial = c.poidsKg }
    const fraction = c.volumeL ? (q.volumeL ?? 0) / c.volumeL : c.poidsKg ? q.poidsKg / c.poidsKg : 0
    const volumeM3 = c.volumeM3 != null ? arrondi2(c.volumeM3 * fraction) : undefined
    const nouvelle: Commande = {
      ...c, id: idSuivant(), partDe: racine(c), statut, voyageId, createdAt: c.createdAt,
      poidsKg: q.poidsKg, nombreUnites: q.nombreUnites, volumeM3, volumeL: q.volumeL,
      enqueteOrdonnateur: undefined, motifRejet: undefined, rejeteeLe: undefined, rejeteePar: undefined, motifAnnulation: undefined, annuleeLe: undefined,
    }
    c.poidsKg = Math.round((c.poidsKg - q.poidsKg) * 100) / 100
    if (c.nombreUnites != null && q.nombreUnites != null) c.nombreUnites = c.nombreUnites - q.nombreUnites
    if (c.volumeM3 != null && volumeM3 != null) c.volumeM3 = arrondi2(c.volumeM3 - volumeM3)
    if (c.volumeL != null && q.volumeL != null) c.volumeL = c.volumeL - q.volumeL
    recalculerContenu(c); recalculerContenu(nouvelle)
    commandes.value.push(nouvelle)
    return nouvelle.id
  }
  /** Commande livrée : sa livraison est déclarée dans son ordre. */
  function estLivree(c: Commande): boolean {
    if (c.statut !== 'affectee' || !c.voyageId) return false
    const e = useVoyagesStore().getById(c.voyageId)?.etapes.find(x => x.commandeId === c.id)
    return !!e?.franchi
  }
  /** Prend une partie d'une commande à livrer (poids, nombre d'unités, volume au prorata) :
   *  la commande devient cette partie, le reste demeure une commande à livrer, liée à l'originale. */
  function fractionner(id: string, part: { poidsKg?: number | null; nombreUnites?: number | null }): { ok: boolean; motif?: string; partId?: string; resteId?: string } {
    const c = getById(id)
    if (!c) return { ok: false, motif: 'Commande introuvable.' }
    if (c.statut === 'annulee') return { ok: false, motif: 'Cette commande est annulée : elle ne se fractionne pas.' }
    if (estLivree(c)) return { ok: false, motif: 'Cette commande est déjà livrée : elle ne se fractionne pas.' }
    if (c.statut === 'rejetee') return { ok: false, motif: 'Cette commande est rejetée : elle ne se fractionne pas.' }
    if (c.statut !== 'en_attente') return { ok: false, motif: "Cette commande est déjà dans un ordre de transport : retirez-la de l'ordre pour la fractionner." }
    const poids = part.poidsKg == null || (part.poidsKg as unknown) === '' ? NaN : Number(part.poidsKg)
    if (!Number.isFinite(poids)) return { ok: false, motif: 'Indiquez le poids de la partie à prendre.' }
    if (poids <= 0) return { ok: false, motif: 'Une partie ne peut pas être nulle : indiquez un poids positif.' }
    if (poids > c.poidsKg) return { ok: false, motif: `La partie (${poids.toLocaleString('fr-FR')} kg) dépasse le reste de la commande (${c.poidsKg.toLocaleString('fr-FR')} kg).` }
    let unites: number | undefined
    if (c.nombreUnites != null && c.nombreUnites > 0) {
      const u = part.nombreUnites == null || (part.nombreUnites as unknown) === '' ? NaN : Number(part.nombreUnites)
      const unite = useParametresPlanificationStore().parametres.uniteComptage
      if (!Number.isFinite(u)) return { ok: false, motif: `Indiquez le nombre de ${unite} de la partie.` }
      if (!Number.isInteger(u) || u <= 0) return { ok: false, motif: `Une partie ne peut pas être nulle : le nombre de ${unite} est un entier positif.` }
      if (u > c.nombreUnites) return { ok: false, motif: `La partie (${u} ${unite}) dépasse le reste de la commande (${c.nombreUnites} ${unite}).` }
      if ((u === c.nombreUnites) !== (poids === c.poidsKg)) return { ok: false, motif: `La partie doit être plus petite que la commande à la fois en poids et en ${unite}.` }
      unites = u
    }
    /* Toute la commande : rien à fractionner. */
    if (poids === c.poidsKg) return { ok: true, partId: c.id }
    const resteId = detacher(c.id, { poidsKg: Math.round((c.poidsKg - poids) * 100) / 100, nombreUnites: unites != null ? c.nombreUnites! - unites : undefined })
    return { ok: true, partId: c.id, resteId }
  }
  /** Carburant : une part de la commande, en litres, partant avec un autre camion de la même tournée. */
  function detacherPartCarburant(id: string, volumeL: number, voyageId: string): string | null {
    const c = getById(id)
    if (!c || !c.volumeL || volumeL <= 0 || volumeL >= c.volumeL) return null
    return detacher(id, { poidsKg: Math.round(c.poidsKg * volumeL / c.volumeL), volumeL }, 'affectee', voyageId)
  }
  /** Les parts d'une même commande toutes deux à livrer se regroupent en une seule. */
  function regrouper(id: string) {
    const c = getById(id)
    if (!c) return
    const aLivrer = partsDe(id).filter(x => x.statut === 'en_attente')
    if (aLivrer.length < 2) return
    const garde = aLivrer[0]!
    const absorbees = aLivrer.slice(1)
    absorbees.forEach(x => {
      garde.poidsKg = Math.round((garde.poidsKg + x.poidsKg) * 100) / 100
      if (x.nombreUnites != null) garde.nombreUnites = (garde.nombreUnites ?? 0) + x.nombreUnites
      if (x.volumeM3 != null) garde.volumeM3 = arrondi2((garde.volumeM3 ?? 0) + x.volumeM3)
      if (x.volumeL != null) garde.volumeL = (garde.volumeL ?? 0) + x.volumeL
    })
    recalculerContenu(garde)
    const ids = new Set(absorbees.map(x => x.id))
    /* Les livraisons passées (ordre annulé, ligne sortie) citent désormais la part qui reste. */
    useVoyagesStore().voyages.forEach(v => {
      v.etapes.forEach(e => { if (e.commandeId && ids.has(e.commandeId)) e.commandeId = garde.id })
      const t = v.carburant
      if (!t) return
      t.plan.forEach(x => {
        if (x.commandeId && ids.has(x.commandeId)) x.commandeId = garde.id
        if (x.commandeOrigineId && ids.has(x.commandeOrigineId)) x.commandeOrigineId = garde.id
      })
      if (t.commandeIds.some(x => ids.has(x))) t.commandeIds = [...new Set(t.commandeIds.map(x => ids.has(x) ? garde.id : x))]
    })
    commandes.value = commandes.value.filter(x => !ids.has(x.id))
    /* Redevenue entière : elle reprend son contenu d'origine. */
    if (partsDe(garde.id).length === 1 && garde.contenuInitial != null) {
      garde.contenu = garde.contenuInitial
      garde.contenuInitial = undefined; garde.unitesInitiales = undefined; garde.poidsInitial = undefined
    }
  }

  /** Carburant : la commande d'une livraison sortie de la tournée retourne parmi les commandes à
   *  planifier, à la date retenue. Pour un reliquat (volume non livré), seule cette part y retourne. */
  function remettreCarburantAPlanifier(id: string, dateSouhaitee: string, volumeL?: number): string | null {
    const c = getById(id)
    if (!c) return null
    const date = dateSouhaitee.slice(0, 10)
    if (volumeL != null && c.volumeL && volumeL > 0 && volumeL < c.volumeL) {
      const partId = detacher(id, { poidsKg: Math.round(c.poidsKg * volumeL / c.volumeL), volumeL }, 'en_attente')
      const part = getById(partId)!
      part.dateSouhaitee = date
      if (part.dateValidite && part.dateValidite < date) part.dateValidite = undefined
      return partId
    }
    c.dateSouhaitee = date
    if (c.dateValidite && c.dateValidite < date) c.dateValidite = undefined
    remettreEnAttente(id)
    return id
  }

  /** Une référence de commande déjà connue (hors demandes annulées) est un doublon. */
  const referenceConnue = (ref?: string) => {
    const r = ref?.trim().toLowerCase()
    return !!r && commandes.value.some(c => c.statut !== 'annulee' && c.referenceExterne?.trim().toLowerCase() === r)
  }

  /** Commandes importées du système de gestion : chacune arrive en attente
   *  d'un ordre, comme une demande transmise par un service. */
  function importer(lignes: Omit<Commande, 'id' | 'statut' | 'createdAt' | 'origine'>[]) {
    let nb = 0
    lignes.forEach(l => {
      if (l.referenceExterne && referenceConnue(l.referenceExterne)) return
      creer({ ...l, origine: 'systeme_externe' }); nb++
    })
    return { ok: true, importees: nb }
  }

  /** L'ordonnateur modifie sa demande tant qu'elle n'est pas dans un ordre ;
   *  une demande rejetée, une fois corrigée, repart en attente. */
  const MOTIF_REPARTIE = 'Cette demande est répartie en plusieurs parts, dont une au moins est déjà dans un ordre de transport.'
  function modifier(id: string, saisie: Partial<Omit<Commande, 'id' | 'statut' | 'voyageId' | 'createdAt'>>) {
    const c = getById(id)
    if (!c || (c.statut !== 'en_attente' && c.statut !== 'rejetee')) return { ok: false, motif: "Cette demande n'est plus modifiable : elle est déjà dans un ordre de transport, ou annulée." }
    if (estRepartie(id)) return { ok: false, motif: `${MOTIF_REPARTIE} Elle n'est plus modifiable.` }
    Object.assign(c, saisie)
    if (c.statut === 'rejetee') { c.statut = 'en_attente'; c.motifRejet = undefined; c.rejeteeLe = undefined; c.rejeteePar = undefined }
    return { ok: true }
  }

  /** Le planificateur renvoie une demande à son ordonnateur, avec un motif
   *  (adresse incomplète, volume impossible à transporter...). */
  function rejeter(id: string, motif: string, par: string) {
    if (!useParametresPlanificationStore().peutPiloter(useAuthStore().role)) return { ok: false, motif: "Votre rôle n'est pas habilité à rejeter une demande de livraison." }
    const c = getById(id)
    if (!c || c.statut !== 'en_attente') return { ok: false, motif: "Seule une demande en attente peut être rejetée." }
    if (estRepartie(id)) return { ok: false, motif: 'Une partie de cette commande est déjà dans un ordre de transport : le reste ne se rejette pas.' }
    if (!motif.trim()) return { ok: false, motif: 'Indiquez le motif du rejet.' }
    c.statut = 'rejetee'; c.motifRejet = motif.trim(); c.rejeteeLe = aujourdhuiISO(); c.rejeteePar = par
    return { ok: true }
  }

  /** L'ordonnateur retire sa demande tant qu'elle n'est dans aucun ordre. */
  function annuler(id: string, motif: string) {
    const c = getById(id)
    if (!c || (c.statut !== 'en_attente' && c.statut !== 'rejetee')) return { ok: false, motif: "Cette demande est déjà dans un ordre de transport : demandez au planificateur de l'en retirer." }
    if (estRepartie(id)) return { ok: false, motif: `${MOTIF_REPARTIE} Demandez au planificateur de l'en retirer.` }
    if (!motif.trim()) return { ok: false, motif: "Indiquez le motif de l'annulation." }
    c.statut = 'annulee'; c.motifAnnulation = motif.trim(); c.annuleeLe = aujourdhuiISO()
    return { ok: true }
  }

  /** Date de validité d'une commande non encore exécutée ; vide, la date souhaitée fait foi. */
  function definirValidite(id: string, date?: string) {
    const c = getById(id)
    if (!c) return { ok: false, motif: 'Commande introuvable.' }
    if (c.statut === 'annulee') return { ok: false, motif: 'Cette commande est annulée.' }
    if (date && !/^\d{4}-\d{2}-\d{2}/.test(date)) return { ok: false, motif: "La date de validité n'est pas valide." }
    if (date && c.dateSouhaitee && date < c.dateSouhaitee.slice(0, 10)) return { ok: false, motif: 'La date de validité ne peut pas précéder la date souhaitée.' }
    c.dateValidite = date || undefined
    return { ok: true }
  }
  /** Commandes dont la date est dépassée sans avoir été exécutées (voir le réglage de la date dépassée). */
  const expirees = computed(() => commandes.value.filter(c => useControlesTransportStore().estExpiree(c)))

  function supprimer(id: string) {
    const c = getById(id)
    if (!c || c.statut !== 'en_attente') return { ok: false, motif: "Cette commande n'est plus en attente." }
    if (estRepartie(id)) return { ok: false, motif: MOTIF_REPARTIE }
    commandes.value = commandes.value.filter(x => x.id !== id)
    return { ok: true }
  }

  /** Affecte un lot de commandes en attente à l'ordre de transport qui vient
   *  de les regrouper : chacune devient indisponible pour un autre
   *  chargement. */
  function affecter(ids: string[], voyageId: string) {
    ids.forEach(id => { const c = getById(id); if (c) { c.statut = 'affectee'; c.voyageId = voyageId } })
  }

  /** Une commande retirée d'un chargement - avant le départ de la tournée -
   *  redevient disponible pour un nouveau regroupement. */
  function remettreEnAttente(id: string) {
    const c = getById(id)
    if (c) { c.statut = 'en_attente'; c.voyageId = undefined; regrouper(id) }
  }

  /* ── Enquête de l'ordonnateur sur l'exécution de sa demande ──
     Proposée une fois l'expédition terminée (ordre terminé ou clôturé),
     facultative, une seule réponse, donnée par l'ordonnateur lui-même. */
  /** Une commande répartie : l'enquête est proposée une fois toutes ses parts livrées (ordres terminés ou clôturés). */
  function enqueteProposee(id: string): boolean {
    const c = getById(id)
    if (!c || c.enqueteOrdonnateur) return false
    const parts = partsDe(id).filter(x => x.statut !== 'annulee')
    if (!parts.length) return false
    return parts.every(x => {
      if (x.statut !== 'affectee' || !x.voyageId) return false
      const v = useVoyagesStore().getById(x.voyageId)
      return !!v && (v.statut === 'livre' || v.statut === 'cloture') && v.etapes.some(e => e.commandeId === x.id)
    })
  }
  /** Par son lien d'enquête, l'ordonnateur (externe, ou d'une commande importée sans émetteur) répond sans compte : il donne son nom. */
  function repondreEnqueteOrdonnateur(id: string, notes: { respectOrdre: number; delais: number; qualite: number; commentaire?: string }, par: string, viaLien = false): { ok: boolean; motif?: string } {
    const c0 = getById(id)
    const c = c0 ? getById(racine(c0)) ?? c0 : undefined
    if (!c) return { ok: false, motif: 'Demande introuvable.' }
    id = c.id
    if (c.enqueteOrdonnateur) return { ok: false, motif: 'Vous avez déjà répondu à cette enquête.' }
    if (viaLien && !par.trim()) return { ok: false, motif: 'Indiquez votre nom.' }
    if (!viaLien && (!par.trim() || (c.emisPar && c.emisPar !== par))) return { ok: false, motif: "Seul l'ordonnateur de la demande peut répondre à cette enquête." }
    if (!enqueteProposee(id)) return { ok: false, motif: "L'enquête n'est proposée qu'une fois l'expédition terminée." }
    const valeurs = [notes.respectOrdre, notes.delais, notes.qualite]
    if (valeurs.some(n => !Number.isInteger(n) || n < 1 || n > 5)) return { ok: false, motif: 'Donnez une note de 1 à 5 pour le respect de la demande, les délais et la qualité.' }
    c.enqueteOrdonnateur = { respectOrdre: notes.respectOrdre, delais: notes.delais, qualite: notes.qualite,
      commentaire: notes.commentaire?.trim() || undefined, reponduLe: maintenant().toISOString(), reponduPar: par.trim() }
    return { ok: true }
  }
  /** Réponse de l'ordonnateur, consultable par le planificateur ; null tant qu'il n'a pas répondu. */
  function enqueteOrdonnateur(commandeId: string): EnqueteOrdonnateur | null {
    return getById(commandeId)?.enqueteOrdonnateur ?? null
  }
  /** Réponses des ordonnateurs pour toutes les demandes d'un ordre de transport. */
  function enquetesOrdonnateurDuVoyage(voyageId: string): { commande: Commande; enquete: EnqueteOrdonnateur }[] {
    /* La réponse d'une commande répartie est portée par sa commande d'origine. */
    const vues = new Set<string>()
    return commandes.value.filter(c => c.voyageId === voyageId).map(c => getById(racine(c)) ?? c)
      .filter(c => c.enqueteOrdonnateur && !vues.has(c.id) && vues.add(c.id)).map(c => ({ commande: c, enquete: c.enqueteOrdonnateur! }))
  }

  return { commandes, enAttente, enAttenteFret, carburantAPlanifier, estCarburant, expirees, definirValidite, getById, creer, importer, referenceConnue, modifier, supprimer, affecter, remettreEnAttente, rejeter, annuler,
    racine, partsDe, rangPart, estRepartie, estLivree, fractionner, detacherPartCarburant, regrouper, remettreCarburantAPlanifier, contenuDeLaPart,
    enqueteProposee, repondreEnqueteOrdonnateur, enqueteOrdonnateur, enquetesOrdonnateurDuVoyage }
})
