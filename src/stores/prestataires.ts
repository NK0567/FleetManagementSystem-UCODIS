import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { PieceJointe } from '../types'

/**
 * Référentiel des prestataires (tiers) de la flotte : ateliers externes,
 * fournisseurs de pièces, de pneus ou de carburant, assureurs,
 * constructeurs, banques. Un prestataire peut être marqué non autorisé à
 * travailler avec l'entreprise : il n'est alors plus proposé nulle part.
 * Le référentiel peut être repris du système de gestion de l'entreprise
 * quand il existe ; à défaut, il se tient ici.
 */
/** Code d'un type de prestataire : la liste se paramètre (FMS-PA-03). */
export type TypePrestataire = string

export const TYPES_PRESTATAIRES_DEFAUT: { code: string; libelle: string }[] = [
  { code: 'atelier', libelle: 'Atelier' }, { code: 'fournisseur_pieces', libelle: 'Fournisseur de pièces' },
  { code: 'fournisseur_pneus', libelle: 'Fournisseur de pneus' }, { code: 'fournisseur_carburant', libelle: 'Fournisseur de carburant' },
  { code: 'assureur', libelle: 'Assureur' }, { code: 'constructeur', libelle: 'Constructeur' }, { code: 'banque', libelle: 'Banque' },
]
/** Libellés des types, tenus à jour avec le référentiel paramétrable. */
export const LIB_TYPE_PRESTATAIRE: Record<string, string> = Object.fromEntries(TYPES_PRESTATAIRES_DEFAUT.map(t => [t.code, t.libelle]))

export interface ContratPrestataire { id: string; objet: string; debut: string; fin?: string; montantAr?: number; document?: PieceJointe }
export interface Prestataire {
  id: string
  nom: string
  type: TypePrestataire
  contact?: string
  telephone?: string
  email?: string
  adresse?: string
  /** Faux : le prestataire n'est plus autorisé à travailler avec l'entreprise. */
  autorise: boolean
  motifNonAutorise?: string
  contrats?: ContratPrestataire[]
  /** Repris du système de gestion de l'entreprise plutôt que saisi. */
  source?: 'saisie' | 'import'
}

const DEFAUT: Prestataire[] = [
  { id: 'PRS-001', nom: 'Garage Poids Lourds Ankorondrano', type: 'atelier', contact: 'Fidy Rakotondrabe', telephone: '034 20 111 22', autorise: true },
  { id: 'PRS-002', nom: 'Atelier Diesel Tanjombato', type: 'atelier', contact: 'Haja Randria', telephone: '033 41 555 18', autorise: true },
  { id: 'PRS-003', nom: 'Mécanique Générale Ivato', type: 'atelier', autorise: false, motifNonAutorise: 'Retards répétés et facturation contestée.' },
  { id: 'PRS-004', nom: 'Pneus Océan Indien', type: 'fournisseur_pneus', contact: 'Lanto Rabe', telephone: '034 05 900 41', autorise: true },
  { id: 'PRS-005', nom: 'Rechapage Hautes Terres', type: 'fournisseur_pneus', telephone: '032 07 340 12', autorise: true },
  { id: 'PRS-006', nom: 'Somaco Antananarivo', type: 'fournisseur_pieces', contact: 'Rija Andriamampionona', telephone: '034 12 345 67', autorise: true },
  { id: 'PRS-007', nom: 'Réseau Stations Hautes Terres', type: 'fournisseur_carburant', contact: 'Service cartes', telephone: '020 22 400 10', autorise: true },
  { id: 'PRS-008', nom: "Carburants de l'Île", type: 'fournisseur_carburant', telephone: '020 22 515 30', autorise: true },
  { id: 'PRS-009', nom: 'Banque de financement Poids Lourds', type: 'banque', contact: 'Service leasing', telephone: '020 22 610 00', autorise: true,
    contrats: [{ id: 'CTR-001', objet: 'Leasing tracteurs 2021-2026', debut: '2021-01-10', fin: '2026-12-31', montantAr: 610_000_000 }] },
  { id: 'PRS-010', nom: 'ARO Madagascar', type: 'assureur', contact: 'Service flottes', telephone: '020 22 201 54', autorise: true,
    contrats: [{ id: 'CTR-002', objet: 'Assurance flotte, responsabilité civile et dommages', debut: '2025-01-01', fin: '2026-12-31' }] },
  { id: 'PRS-011', nom: 'NY HAVANA Assurances', type: 'assureur', telephone: '020 22 268 20', autorise: true },
  { id: 'PRS-012', nom: 'Distributeur Poids Lourds Antananarivo', type: 'constructeur', contact: 'Service après-vente', autorise: true },
  { id: 'PRS-013', nom: 'Filtres & Lubrifiants Océan Indien', type: 'fournisseur_pieces', contact: 'Nirina Ravalison', telephone: '033 98 765 43', autorise: true },
  { id: 'PRS-014', nom: 'Freinage Pro Antananarivo', type: 'fournisseur_pieces', contact: 'Tiana Rakotoson', telephone: '032 55 112 20', autorise: true },
  { id: 'PRS-015', nom: 'Électricité Poids Lourds SARL', type: 'fournisseur_pieces', contact: 'Herimanana Rasolofo', telephone: '034 77 220 10', autorise: true },
]
const CLE = 'fms-ucodis-prestataires'
const CLE_TYPES = 'fms-ucodis-types-prestataires'

export const usePrestatairesStore = defineStore('prestataires', () => {
  let initial = DEFAUT
  try {
    const b = localStorage.getItem(CLE)
    if (b) {
      // Les prestataires de départ ajoutés depuis la dernière visite sont complétés.
      const enregistres = JSON.parse(b) as Prestataire[]
      initial = [...enregistres, ...DEFAUT.filter(d => !enregistres.some(e => e.id === d.id))]
    }
  } catch { /* défaut */ }
  const prestataires = ref<Prestataire[]>(initial)
  watch(prestataires, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })

  const types = ref<{ code: string; libelle: string }[]>(TYPES_PRESTATAIRES_DEFAUT.map(t => ({ ...t })))
  try { const b = localStorage.getItem(CLE_TYPES); if (b) { const lus = JSON.parse(b) as { code: string; libelle: string }[]; types.value = [...lus, ...TYPES_PRESTATAIRES_DEFAUT.filter(d => !lus.some(t => t.code === d.code))] } } catch { /* défaut */ }
  watch(types, v => { try { localStorage.setItem(CLE_TYPES, JSON.stringify(v)) } catch { /* ignoré */ } ; v.forEach(t => { LIB_TYPE_PRESTATAIRE[t.code] = t.libelle }) }, { deep: true, immediate: true })

  const getById = (id?: string) => prestataires.value.find(p => p.id === id)
  /** Prestataires autorisés d'un type donné, seuls proposés aux choix. */
  const autorisesDeType = (...typesVoulus: TypePrestataire[]) => prestataires.value.filter(p => typesVoulus.includes(p.type) && p.autorise)
  const ateliersAutorises = computed(() => autorisesDeType('atelier'))
  const nouvelId = () => { let n = prestataires.value.length + 1; while (prestataires.value.some(p => p.id === `PRS-${String(n).padStart(3, '0')}`)) n++; return `PRS-${String(n).padStart(3, '0')}` }

  function valider(p: Pick<Prestataire, 'nom' | 'type' | 'email'>, ignorerId?: string): string | null {
    if (!p.nom.trim()) return 'Indiquez le nom du prestataire.'
    if (!types.value.some(t => t.code === p.type)) return 'Choisissez le type de prestataire.'
    if (p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) return "L'adresse e-mail n'est pas valide."
    if (prestataires.value.some(x => x.id !== ignorerId && x.nom.trim().toLowerCase() === p.nom.trim().toLowerCase() && x.type === p.type)) return 'Ce prestataire existe déjà.'
    return null
  }
  function creer(p: Omit<Prestataire, 'id'>): { ok: boolean; id?: string; motif?: string } {
    const motif = valider(p); if (motif) return { ok: false, motif }
    const id = nouvelId()
    prestataires.value.push({ ...p, nom: p.nom.trim(), id, contrats: p.contrats ?? [] })
    return { ok: true, id }
  }
  function modifier(id: string, data: Partial<Omit<Prestataire, 'id'>>): { ok: boolean; motif?: string } {
    const p = getById(id); if (!p) return { ok: false, motif: 'Prestataire introuvable.' }
    const motif = valider({ nom: data.nom ?? p.nom, type: data.type ?? p.type, email: data.email ?? p.email }, id); if (motif) return { ok: false, motif }
    Object.assign(p, data)
    return { ok: true }
  }
  /** Un prestataire non autorisé n'est plus proposé nulle part ; la raison est conservée. */
  function changerAutorisation(id: string, autorise: boolean, motif?: string): { ok: boolean; motif?: string } {
    const p = getById(id); if (!p) return { ok: false, motif: 'Prestataire introuvable.' }
    if (!autorise && !motif?.trim()) return { ok: false, motif: 'Indiquez pourquoi le prestataire n’est plus autorisé.' }
    p.autorise = autorise; p.motifNonAutorise = autorise ? undefined : motif!.trim()
    return { ok: true }
  }
  function ajouterContrat(id: string, c: Omit<ContratPrestataire, 'id'>): { ok: boolean; motif?: string } {
    const p = getById(id); if (!p) return { ok: false, motif: 'Prestataire introuvable.' }
    if (!c.objet.trim()) return { ok: false, motif: "Indiquez l'objet du contrat." }
    if (!c.debut) return { ok: false, motif: 'Indiquez la date de début du contrat.' }
    if (c.fin && c.fin < c.debut) return { ok: false, motif: 'La fin du contrat ne peut pas précéder son début.' }
    if (c.montantAr != null && c.montantAr < 0) return { ok: false, motif: 'Le montant ne peut pas être négatif.' }
    const ids = prestataires.value.flatMap(x => x.contrats ?? []).map(x => x.id)
    let n = ids.length + 1; while (ids.includes(`CTR-${String(n).padStart(3, '0')}`)) n++
    ;(p.contrats ??= []).push({ ...c, objet: c.objet.trim(), id: `CTR-${String(n).padStart(3, '0')}` })
    return { ok: true }
  }
  function ajouterType(libelle: string): { ok: boolean; motif?: string } {
    const l = libelle.trim()
    if (!l) return { ok: false, motif: 'Indiquez le libellé du type.' }
    if (types.value.some(t => t.libelle.toLowerCase() === l.toLowerCase())) return { ok: false, motif: 'Ce type existe déjà.' }
    const base = l.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    let code = base; let n = 2
    while (types.value.some(t => t.code === code)) code = `${base}_${n++}`
    types.value.push({ code, libelle: l })
    return { ok: true }
  }
  return { prestataires, types, getById, autorisesDeType, ateliersAutorises, creer, modifier, changerAutorisation, ajouterContrat, ajouterType }
})
