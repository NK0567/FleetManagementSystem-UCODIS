import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AutorisationDepart, ControleDepart } from '../types'
import { POINTS_CHECKLIST_ROUTE } from './controles'

export const LIB_CONTROLE_DEPART: Record<ControleDepart, string> = {
  checklist: 'Checklist véhicule conforme',
  alcool_drogue: 'Test alcool et drogue négatif',
  documents_chauffeur: 'Documents chauffeur valides',
  documents_vehicule: 'Documents véhicule valides',
}

/**
 * Autorisations de départ, reprises du module Control Room du socle FMS
 * (US 2.4.1) : quatre contrôles doivent tous être conformes avant qu'un
 * départ soit accordé. Le test alcool/drogue n'est mentionné dans
 * aucun document UCODIS ; il est conservé comme pratique de sécurité
 * transposée du socle FMS, à confirmer.
 */
export const useDepartsStore = defineStore('departs', () => {
  const autorisations = ref<AutorisationDepart[]>([
    {
      id: 'AUT-001', reference: 'AUT-2026-0213', voyageId: 'VOY-004', voyageRef: 'VOY-2026-0150',
      vehiculeId: 'v-tr-3', vehiculePlaque: '4023 TBA', chauffeurId: 'p-012', chauffeurNom: 'Tiana Rasolofoson',
      demandeeLe: '2026-09-10T06:02:00',
      controles: [
        { controle: 'checklist', conforme: true },
        { controle: 'alcool_drogue', conforme: true, detail: 'Test négatif à 05h48.' },
        { controle: 'documents_chauffeur', conforme: true },
        { controle: 'documents_vehicule', conforme: true },
      ],
      accordee: false,
      briefingSecuriteFait: true, reposHebdoVerifie: true,
    },
    {
      id: 'AUT-002', reference: 'AUT-2026-0212', voyageId: 'VOY-002', voyageRef: 'VOY-2026-0149',
      vehiculeId: 'v-tr-3', vehiculePlaque: '4023 TBA', chauffeurId: 'p-012', chauffeurNom: 'Tiana Rasolofoson',
      demandeeLe: '2026-09-03T06:05:00',
      controles: [
        { controle: 'checklist', conforme: true },
        { controle: 'alcool_drogue', conforme: true, detail: 'Test négatif à 05h50.' },
        { controle: 'documents_chauffeur', conforme: true },
        { controle: 'documents_vehicule', conforme: true },
      ],
      accordee: true, decidePar: 'Hery Andriamalala', decideLe: '2026-09-03T06:08:00',
      briefingSecuriteFait: true, reposHebdoVerifie: true, suiviActiveLe: '2026-09-03T06:10:00',
      checklistDepart: Object.fromEntries(POINTS_CHECKLIST_ROUTE.map(p => [p.code, true])),
      checklistValideeLe: '2026-09-03T06:04:00',
    },
    {
      id: 'AUT-003', reference: 'AUT-2026-0211', voyageId: 'VOY-001', voyageRef: 'VOY-2026-0148',
      vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA', chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga',
      demandeeLe: '2026-08-24T05:45:00',
      controles: [
        { controle: 'checklist', conforme: false, detail: "Essuie-glace côté passager usé - poursuite acceptée avec réserve." },
        { controle: 'alcool_drogue', conforme: true, detail: 'Test négatif à 05h30.' },
        { controle: 'documents_chauffeur', conforme: false, detail: "Absence du duplicata de la visite médicale sur place." },
        { controle: 'documents_vehicule', conforme: true },
      ],
      accordee: false, decidePar: 'Hery Andriamalala', decideLe: '2026-08-24T05:48:00',
      motifRefus: 'Deux contrôles non conformes : régularisation requise avant tout nouveau départ.',
    },
  ])

  const getById = (id: string) => autorisations.value.find(a => a.id === id)
  const enAttente = computed(() => autorisations.value.filter(a => !a.decideLe))
  const accordees = computed(() => autorisations.value.filter(a => !!a.decideLe && a.accordee))
  const refusees = computed(() => autorisations.value.filter(a => !!a.decideLe && !a.accordee))

  function nbConformes(a: AutorisationDepart) { return a.controles.filter(c => c.conforme).length }

  /** Valide la checklist point par point directement depuis la fiche,
   *  puis fait passer le contrôle « Checklist véhicule conforme » à
   *  conforme dès lors qu'aucune anomalie n'a été cochée en défaut. */
  function validerChecklistDepart(id: string, resultats: Record<string, boolean>) {
    const a = getById(id)
    if (!a) return
    a.checklistDepart = resultats
    a.checklistValideeLe = new Date().toISOString()
    const tousConformes = Object.values(resultats).every(v => v)
    const c = a.controles.find(x => x.controle === 'checklist')
    if (c) {
      c.conforme = tousConformes
      c.detail = tousConformes ? undefined : 'Anomalie relevée sur la checklist avant départ.'
    }
  }

  function accorder(id: string, par: string) {
    const a = getById(id)
    if (!a) return
    a.accordee = true
    a.decidePar = par
    a.decideLe = new Date().toISOString()
    a.suiviActiveLe = new Date().toISOString()
  }
  function refuser(id: string, par: string, motif: string) {
    const a = getById(id)
    if (!a) return
    a.accordee = false
    a.decidePar = par
    a.decideLe = new Date().toISOString()
    a.motifRefus = motif
  }

  function peutPartir(a: AutorisationDepart) { return a.controles.every(c => c.conforme) }

  return { autorisations, getById, enAttente, accordees, refusees, nbConformes, peutPartir, validerChecklistDepart, accorder, refuser }
})
