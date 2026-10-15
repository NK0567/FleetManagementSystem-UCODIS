import { maintenantMs, maintenant } from '../utils/horloge'
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useMaintenanceStore } from './maintenance'
import { useVoyagesStore } from './voyages'
import type { ChecklistRoute, PointChecklistRoute, ReleveChecklist, ResultatPoint } from '../types'

/**
 * Les seize points, repris tels quels du formulaire « Checklist sur
 * Route » du socle FMS (source citée dans le code de référence :
 * formulaire papier v4, mise à jour du 30/10/2024). Aucun formulaire équivalent
 * n'a été fourni par UCODIS à ce jour ; ces points servent de base de
 * travail en attendant, comme demandé.
 */
export const POINTS_CHECKLIST_ROUTE: PointChecklistRoute[] = [
  { code: 'FRS', libelle: 'Frein de service' },
  { code: 'FST', libelle: 'Frein de stationnement' },
  { code: 'FLX', libelle: "Flexible - fuite d'air, branchement" },
  { code: 'DIR', libelle: 'Direction' },
  { code: 'KLX', libelle: 'Klaxon' },
  { code: 'ESG', libelle: 'Essuie-glace' },
  { code: 'RET', libelle: 'Rétroviseur' },
  { code: 'SEC', libelle: 'Matériel de secours - réflecteur, panneau' },
  { code: 'ECL', libelle: 'Éclairage et signalisation' },
  { code: 'PNE', libelle: 'Pneumatiques - clous, gonflage' },
  { code: 'SUS', libelle: 'Suspension' },
  { code: 'CHA', libelle: 'Cadre de châssis' },
  { code: 'ATT', libelle: "Dispositif d'attelage - sellette, cadenas, chaîne" },
  { code: 'EXT', libelle: 'Extincteurs - expiration, plomb, goupille, pression' },
  { code: 'CAL', libelle: 'Cales' },
  { code: 'BAC', libelle: 'Bâche et sanglage du chargement' },
]

export const useControlesStore = defineStore('controles', () => {
  const checklists = ref<ChecklistRoute[]>([
    {
      id: 'CKL-001', reference: 'CKL-2026-0151', voyageId: 'VOY-002', voyageRef: 'VOY-2026-0149',
      vehiculeId: 'v-tr-3', tracteurPlaque: '4023 TBA', semiRemorquePlaque: 'RM 4103',
      chauffeurId: 'p-012', chauffeurNom: 'Tiana Rasolofoson',
      dateDebut: '2026-08-29T06:20:00',
      releves: [
        { pause: 1, horodatage: '2026-08-29T06:20:00', lieu: 'Dépôt Tanjombato',
          resultats: {
            FRS: 'conforme', FST: 'conforme', FLX: 'conforme', DIR: 'conforme', KLX: 'conforme',
            ESG: 'conforme', RET: 'conforme', SEC: 'conforme', ECL: 'conforme', PNE: 'conforme',
            SUS: 'conforme', CHA: 'conforme', ATT: 'conforme', EXT: 'conforme', CAL: 'conforme',
            BAC: 'anomalie',
          },
          commentaires: { BAC: 'Sangle avant détendue, resserrée avant départ.', PNE: 'Pression vérifiée au manomètre.' } },
      ],
      signeParChauffeur: true, signeLe: '2026-08-29T06:20:00', synchroniseLe: '2026-08-29T06:35:00',
    },
    {
      id: 'CKL-002', reference: 'CKL-2026-0148', voyageId: 'VOY-001', voyageRef: 'VOY-2026-0148',
      vehiculeId: 'v-tr-1', tracteurPlaque: '4021 TBA', semiRemorquePlaque: 'RM 4101',
      chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga',
      dateDebut: '2026-08-24T05:40:00',
      releves: [
        { pause: 1, horodatage: '2026-08-24T05:40:00', lieu: 'Dépôt Tanjombato',
          resultats: {
            FRS: 'conforme', FST: 'conforme', FLX: 'conforme', DIR: 'conforme', KLX: 'conforme',
            ESG: 'anomalie', RET: 'conforme', SEC: 'conforme', ECL: 'conforme', PNE: 'conforme',
            SUS: 'conforme', CHA: 'conforme', ATT: 'conforme', EXT: 'non_verifie', CAL: 'conforme',
            BAC: 'conforme',
          },
          commentaires: { ESG: 'Essuie-glace côté passager usé, à remplacer au retour.' } },
        { pause: 2, horodatage: '2026-08-24T09:05:00', lieu: 'Relais Moramanga',
          resultats: {
            FRS: 'conforme', FST: 'conforme', FLX: 'conforme', DIR: 'conforme', KLX: 'conforme',
            ESG: 'anomalie', RET: 'conforme', SEC: 'conforme', ECL: 'conforme', PNE: 'conforme',
            SUS: 'conforme', CHA: 'conforme', ATT: 'conforme', EXT: 'conforme', CAL: 'conforme',
            BAC: 'conforme',
          },
          commentaires: { ESG: 'Toujours usé, pas de pluie sur le trajet.' } },
      ],
      signeParChauffeur: true, signeLe: '2026-08-24T09:05:00', synchroniseLe: '2026-08-24T18:20:00',
    },
  ])

  // Les relevés sont conservés d'une session à l'autre (saisie sur le téléphone, lecture au bureau).
  const CLE_CHECKLISTS = 'fms-ucodis-checklists-route'
  try { const b = localStorage.getItem(CLE_CHECKLISTS); if (b) checklists.value = JSON.parse(b) } catch { /* défaut */ }
  watch(checklists, v => { try { localStorage.setItem(CLE_CHECKLISTS, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  // Checklists signées sans date de signature (données antérieures) : on reprend l'heure du dernier relevé.
  checklists.value.forEach(c => { if (c.signeParChauffeur && !c.signeLe && c.releves.length) c.signeLe = c.releves[c.releves.length - 1]!.horodatage })

  const getById = (id: string) => checklists.value.find(c => c.id === id)

  /* ── Points de contrôle paramétrables (FMS-SC-03) ─────────── */
  const CLE_POINTS = 'fms-ucodis-points-checklist-route'
  const points = ref<PointChecklistRoute[]>(POINTS_CHECKLIST_ROUTE.map(p => ({ ...p, actif: true })))
  try { const b = localStorage.getItem(CLE_POINTS); if (b) points.value = JSON.parse(b) } catch { /* défaut */ }
  watch(points, v => { try { localStorage.setItem(CLE_POINTS, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  const pointsActifs = computed(() => points.value.filter(p => p.actif !== false))
  function libellePoint(code: string, releve?: ReleveChecklist) { return releve?.libelles?.[code] ?? points.value.find(p => p.code === code)?.libelle ?? POINTS_CHECKLIST_ROUTE.find(p => p.code === code)?.libelle ?? code }
  function ajouterPoint(code: string, libelle: string): { ok: boolean; motif?: string } {
    const c = code.trim().toUpperCase()
    if (!c || !libelle.trim()) return { ok: false, motif: 'Indiquez le code et le libellé du point.' }
    if (points.value.some(p => p.code === c)) return { ok: false, motif: 'Ce code existe déjà.' }
    points.value.push({ code: c, libelle: libelle.trim(), actif: true })
    return { ok: true }
  }
  function reinitialiserPoints() { points.value = POINTS_CHECKLIST_ROUTE.map(p => ({ ...p, actif: true })) }

  /* ── Saisie sur route, y compris sans réseau ───────────────── */
  interface SaisieReleve { voyageId: string; lieu: string; resultats: Record<string, ResultatPoint>; commentaires: Record<string, string>; horodatage: string; chauffeurId: string; chauffeurNom: string }
  const CLE_FILE = 'fms-ucodis-checklists-hors-ligne'
  const fileAttente = ref<SaisieReleve[]>([])
  try { const b = localStorage.getItem(CLE_FILE); if (b) fileAttente.value = JSON.parse(b) } catch { /* vide */ }
  watch(fileAttente, v => { try { localStorage.setItem(CLE_FILE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  function verifierSaisie(s: SaisieReleve): string | null {
    const manquants = pointsActifs.value.filter(p => !s.resultats[p.code] || s.resultats[p.code] === 'non_verifie')
    if (manquants.length) return `Notez chaque point : ${manquants.map(p => p.libelle).join(', ')}.`
    const sansCommentaire = pointsActifs.value.filter(p => s.resultats[p.code] === 'anomalie' && !s.commentaires[p.code]?.trim())
    if (sansCommentaire.length) return `Décrivez l'anomalie : ${sansCommentaire.map(p => p.libelle).join(', ')}.`
    return null
  }
  /** Ajoute le relevé de la pause à la checklist du voyage (créée au premier relevé). */
  function enregistrer(s: SaisieReleve, horsLigneLe?: string): { ok: boolean; motif?: string; checklistId?: string } {
    const voyage = useVoyagesStore().voyages.find(v => v.id === s.voyageId)
    if (!voyage) return { ok: false, motif: 'Voyage introuvable.' }
    let c = checklists.value.find(x => x.voyageId === s.voyageId)
    if (!c) {
      const n = checklists.value.length + 1
      const annee = s.horodatage.slice(0, 4)
      const numero = Math.max(0, ...checklists.value.filter(x => x.reference.startsWith(`CKL-${annee}-`)).map(x => Number(x.reference.split('-')[2]) || 0)) + 1
      c = { id: `CKL-${String(n).padStart(3, '0')}-${maintenantMs() % 10000}`, reference: `CKL-${annee}-${String(numero).padStart(4, '0')}`,
        voyageId: voyage.id, voyageRef: voyage.reference, vehiculeId: voyage.vehiculeId ?? '', tracteurPlaque: voyage.vehiculePlaque ?? '-',
        semiRemorquePlaque: voyage.semiRemorquePlaque, chauffeurId: s.chauffeurId, chauffeurNom: s.chauffeurNom, dateDebut: s.horodatage, releves: [], signeParChauffeur: true }
      checklists.value.unshift(c)
    }
    if (c.releves.some(r => r.horodatage === s.horodatage)) return { ok: true, checklistId: c.id }
    c.releves.push({ pause: c.releves.length + 1, horodatage: s.horodatage, lieu: s.lieu.trim() || undefined, resultats: { ...s.resultats },
      commentaires: Object.fromEntries(Object.entries(s.commentaires).filter(([, v]) => v.trim())),
      libelles: Object.fromEntries(pointsActifs.value.map(p => [p.code, p.libelle])), saisiHorsLigneLe: horsLigneLe })
    // L'enregistrement depuis l'espace authentifié du conducteur vaut signature des constats.
    c.signeParChauffeur = true
    if (!c.signeLe || s.horodatage > c.signeLe) c.signeLe = s.horodatage
    c.synchroniseLe = maintenant().toISOString()
    return { ok: true, checklistId: c.id }
  }
  /** Avec le réseau, le relevé est enregistré tout de suite ; sans réseau, il attend la reconnexion. */
  function soumettre(s: SaisieReleve, enLigne = typeof navigator === 'undefined' || navigator.onLine): { ok: boolean; motif?: string; horsLigne?: boolean } {
    const motif = verifierSaisie(s); if (motif) return { ok: false, motif }
    if (!enLigne) { fileAttente.value.push({ ...s, resultats: { ...s.resultats }, commentaires: { ...s.commentaires } }); return { ok: true, horsLigne: true } }
    const r = enregistrer(s)
    return { ok: r.ok, motif: r.motif }
  }
  function synchroniser() {
    const restants: SaisieReleve[] = []
    fileAttente.value.forEach(s => { if (!enregistrer(s, s.horodatage).ok) restants.push(s) })
    const n = fileAttente.value.length - restants.length
    fileAttente.value = restants
    return n
  }
  if (typeof window !== 'undefined') window.addEventListener('online', () => synchroniser())

  /** Ouvre un ordre de travail sur une anomalie relevée en route. */
  function ouvrirOrdreTravail(checklistId: string, pause: number, code: string, par: string): { ok: boolean; motif?: string; ref?: string } {
    const c = getById(checklistId); const r = c?.releves.find(x => x.pause === pause)
    if (!c || !r) return { ok: false, motif: 'Relevé introuvable.' }
    if (r.resultats[code] !== 'anomalie') return { ok: false, motif: "Ce point n'est pas en anomalie." }
    if (r.ordresTravail?.[code]) return { ok: false, motif: `Un ordre de travail est déjà ouvert (${r.ordresTravail[code]}).` }
    const ref = useMaintenanceStore().creerOT({ vehiculeId: c.vehiculeId, vehiculePlaque: c.tracteurPlaque, origine: 'checklist', declarePar: par,
      declareLe: maintenant().toISOString(), symptome: `${libellePoint(code, r)} : ${r.commentaires?.[code] ?? r.commentaire ?? 'anomalie relevée en route'} (pause ${pause}, ${c.reference}).`,
      gravite: 'majeure', typeMaintenance: 'correctif' })
    r.ordresTravail = { ...(r.ordresTravail ?? {}), [code]: ref }
    return { ok: true, ref }
  }

  function nbAnomalies(c: ChecklistRoute) {
    return c.releves.reduce((s, r) => s + Object.values(r.resultats).filter(v => v === 'anomalie').length, 0)
  }
  const avecAnomalie = computed(() => checklists.value.filter(c => nbAnomalies(c) > 0))
  const signees = computed(() => checklists.value.filter(c => c.signeParChauffeur))
  const synchronisees = computed(() => checklists.value.filter(c => !!c.synchroniseLe))
  const relevesTotaux = computed(() => checklists.value.reduce((s, c) => s + c.releves.length, 0))

  return {
    points, pointsActifs, libellePoint, ajouterPoint, reinitialiserPoints, fileAttente, verifierSaisie, soumettre, synchroniser, ouvrirOrdreTravail,
    checklists, getById, nbAnomalies, avecAnomalie, signees, synchronisees, relevesTotaux,
  }
})
