import { maintenantMs, maintenant } from '../utils/horloge'
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useMaintenanceStore } from './maintenance'
import { useVehiculeStore } from './vehicules'
import type { PosteAudit, VerdictPoste, AuditConformite, ResultatPoste } from '../types'

/**
 * Inspection périodique du véhicule et de la citerne. Elle suit
 * une grille paramétrable dont chaque poste porte un code et un verdict ;
 * elle produit un rapport daté et signé. Un poste non conforme programme
 * une contre-visite et ouvre un ordre de travail ; tant que la contre-visite
 * n'est pas conforme, le véhicule n'est pas apte à charger.
 */
export const LIB_VERDICT: Record<VerdictPoste, { label: string; cls: string }> = {
  conforme: { label: 'Conforme', cls: 'bg-success-bg text-success' },
  conforme_observation: { label: 'Conforme avec observation', cls: 'bg-warning-bg text-warning' },
  non_conforme: { label: 'Non conforme', cls: 'bg-danger-bg text-danger' },
}

const GRILLE_DEFAUT: PosteAudit[] = [
  { code: '100.10', categorie: 'Type et réglementation', libelle: 'Type de véhicule et catégorie' },
  { code: '102.10', categorie: 'Poids et dimensions', libelle: 'PTAC et PTRA' },
  { code: '102.20', categorie: 'Poids et dimensions', libelle: 'Dimensions hors tout' },
  { code: '104.10', categorie: 'Identification', libelle: 'Frappe à froid du châssis, 17 caractères' },
  { code: '104.20', categorie: 'Identification', libelle: 'Concordance des plaques et de la carte grise' },
  { code: '106.10', categorie: 'Ordinateur de bord', libelle: 'Boîtier embarqué et enregistrement des données' },
  { code: '110.10', categorie: 'Châssis', libelle: 'État du cadre de châssis' },
  { code: '112.10', categorie: 'Chaîne cinématique', libelle: 'Transmission et arbres' },
  { code: '114.10', categorie: 'Échappement', libelle: 'Étanchéité et fixation' },
  { code: '116.10', categorie: 'Essieux', libelle: 'État et jeu des essieux' },
  { code: '118.10', categorie: 'Roues et pneumatiques', libelle: 'Usure, pression, homogénéité' },
  { code: '122.50.1', categorie: 'Freinage', libelle: 'Efficacité du frein de service' },
  { code: '122.50.2', categorie: 'Freinage', libelle: 'Efficacité du frein de stationnement' },
  { code: '124.10', categorie: "Réservoirs d'air", libelle: 'Étanchéité et purge' },
  { code: '140.10', categorie: 'Équipement électrique', libelle: 'Faisceaux et connexions' },
  { code: '142.10', categorie: 'Éclairage et signalisation', libelle: 'Feux avant et arrière' },
  { code: '142.20', categorie: 'Éclairage et signalisation', libelle: 'Feux de gabarit et catadioptres' },
  { code: '160.10', categorie: 'Citerne', libelle: 'Étanchéité de la cuve et des compartiments' },
  { code: '160.20', categorie: 'Citerne', libelle: 'Vannes, clapets et trous d’homme' },
]

const tous = (verdict: (code: string, i: number) => VerdictPoste, obs: (i: number) => string | undefined = () => undefined): ResultatPoste[] =>
  GRILLE_DEFAUT.map((p, i) => ({ code: p.code, verdict: verdict(p.code, i), observation: obs(i) }))
const libellesGrille = () => Object.fromEntries(GRILLE_DEFAUT.map(p => [p.code, { categorie: p.categorie, libelle: p.libelle }]))

const SEED: AuditConformite[] = [
  { id: 'INS-001', reference: 'INS-2026-004', vehiculeId: 'v-tr-1', tracteurPlaque: '4021 TBA', semiRemorquePlaque: 'RM 4101',
    date: '2026-08-15T09:00:00', auditeur: 'Tojo Rasoanaivo', resultats: tous(() => 'conforme'), conforme: true,
    signataire: 'Tojo Rasoanaivo', signeLe: '2026-08-15T11:40:00', libelles: libellesGrille() },
  { id: 'INS-002', reference: 'INS-2026-003', vehiculeId: 'v-tr-2', tracteurPlaque: '4022 TBA', semiRemorquePlaque: 'RM 4102',
    date: '2026-07-20T10:30:00', auditeur: 'Tojo Rasoanaivo',
    resultats: tous((_, i) => i === 11 ? 'non_conforme' : i === 4 ? 'conforme_observation' : 'conforme',
      i => i === 11 ? 'Frein de service en limite basse d’efficacité, réglage requis.' : i === 4 ? 'Plaque légèrement décollée, à recoller.' : undefined),
    conforme: false, contreVisiteLe: '2026-08-05T09:00:00', signataire: 'Tojo Rasoanaivo', signeLe: '2026-07-20T12:15:00',
    libelles: libellesGrille(), leveeParId: 'INS-003' },
  { id: 'INS-003', reference: 'INS-2026-005', vehiculeId: 'v-tr-2', tracteurPlaque: '4022 TBA', semiRemorquePlaque: 'RM 4102',
    date: '2026-08-05T09:00:00', auditeur: 'Tojo Rasoanaivo', resultats: tous(() => 'conforme'), conforme: true,
    contreVisiteDe: 'INS-002', signataire: 'Tojo Rasoanaivo', signeLe: '2026-08-05T10:20:00', libelles: libellesGrille(),
    commentaire: 'Contre-visite : frein de service réglé, efficacité conforme.' },
]

const CLE = 'fms-ucodis-inspections'
const CLE_GRILLE = 'fms-ucodis-grille-inspection'
const CLE_DELAI = 'fms-ucodis-delai-contre-visite'

export const useInspectionsStore = defineStore('inspections', () => {
  const grille = ref<PosteAudit[]>(GRILLE_DEFAUT.map(p => ({ ...p, actif: true })))
  const inspections = ref<AuditConformite[]>(SEED.map(a => structuredClone(a)))
  const delaiContreVisiteJours = ref(15)
  try { const b = localStorage.getItem(CLE_GRILLE); if (b) grille.value = JSON.parse(b) } catch { /* défaut */ }
  try { const b = localStorage.getItem(CLE); if (b) inspections.value = JSON.parse(b) } catch { /* défaut */ }
  try { const b = localStorage.getItem(CLE_DELAI); if (b && Number(b) >= 1) delaiContreVisiteJours.value = Math.round(Number(b)) } catch { /* défaut */ }
  watch(grille, v => { try { localStorage.setItem(CLE_GRILLE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  watch(inspections, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  watch(delaiContreVisiteJours, v => { try { localStorage.setItem(CLE_DELAI, String(v)) } catch { /* ignoré */ } })

  const postesActifs = computed(() => grille.value.filter(p => p.actif !== false))
  const getById = (id: string) => inspections.value.find(a => a.id === id)
  const nbNonConformes = (a: AuditConformite) => a.resultats.filter(r => r.verdict === 'non_conforme').length
  /** Libellé d'un poste tel qu'il était au moment de l'inspection. */
  const poste = (a: AuditConformite, code: string) => a.libelles?.[code] ?? grille.value.find(p => p.code === code) ?? { categorie: 'Autres', libelle: code }

  /** Inspections non conformes dont la contre-visite n'a pas encore levé la non-conformité. */
  const enAttenteContreVisite = computed(() => inspections.value.filter(a => !a.conforme && !a.leveeParId))
  /** Aptitude à charger : la dernière inspection du véhicule doit être conforme. */
  function aptitude(vehiculeId: string): { apte: boolean; motif?: string; inspection?: AuditConformite } {
    const att = enAttenteContreVisite.value.find(a => a.vehiculeId === vehiculeId)
    if (!att) return { apte: true }
    return { apte: false, inspection: att, motif: `Inspection ${att.reference} non conforme, contre-visite prévue le ${att.contreVisiteLe?.slice(0, 10).split('-').reverse().join('/')}` }
  }

  function realiser(d: { vehiculeId: string; inspecteur: string; date: string; resultats: Record<string, { verdict?: VerdictPoste; observation?: string }>; signataire: string; commentaire?: string; contreVisiteDe?: string }): { ok: boolean; id?: string; motif?: string } {
    const vehicules = useVehiculeStore()
    const v = vehicules.parId(d.vehiculeId)
    if (!v) return { ok: false, motif: 'Choisissez le véhicule.' }
    if (v.statut === 'sorti') return { ok: false, motif: 'Ce véhicule est sorti du parc.' }
    if (!d.inspecteur.trim()) return { ok: false, motif: "Indiquez qui réalise l'inspection." }
    if (!d.date) return { ok: false, motif: "Indiquez la date de l'inspection." }
    if (new Date(d.date).getTime() > maintenantMs()) return { ok: false, motif: "La date de l'inspection ne peut pas être dans le futur." }
    const sansVerdict = postesActifs.value.filter(p => !d.resultats[p.code]?.verdict)
    const liste = (l: PosteAudit[]) => l.length <= 3 ? l.map(p => p.code).join(', ') : `${l.slice(0, 3).map(p => p.code).join(', ')} et ${l.length - 3} autre(s)`
    if (sansVerdict.length) return { ok: false, motif: `Donnez un verdict à chaque poste : ${liste(sansVerdict)}.` }
    const sansObs = postesActifs.value.filter(p => d.resultats[p.code]?.verdict !== 'conforme' && !d.resultats[p.code]?.observation?.trim())
    if (sansObs.length) return { ok: false, motif: `Décrivez l'observation des postes ${liste(sansObs)}.` }
    if (!d.signataire.trim()) return { ok: false, motif: 'Le rapport doit être signé.' }
    const origine = d.contreVisiteDe ? getById(d.contreVisiteDe) : undefined
    if (d.contreVisiteDe && (!origine || origine.vehiculeId !== d.vehiculeId || origine.conforme || origine.leveeParId))
      return { ok: false, motif: "L'inspection à contre-visiter n'est plus en attente pour ce véhicule." }

    const resultats: ResultatPoste[] = postesActifs.value.map(p => ({ code: p.code, verdict: d.resultats[p.code]!.verdict!, observation: d.resultats[p.code]!.observation?.trim() || undefined }))
    const nonConformes = resultats.filter(r => r.verdict === 'non_conforme')
    const annee = d.date.slice(0, 4)
    const numero = Math.max(0, ...inspections.value.filter(a => a.reference.startsWith(`INS-${annee}-`)).map(a => Number(a.reference.split('-')[2]) || 0)) + 1
    const id = `INS-${maintenantMs()}`
    const att = vehicules.attelageActif(d.vehiculeId)
    const insp: AuditConformite = {
      id, reference: `INS-${annee}-${String(numero).padStart(3, '0')}`, vehiculeId: v.id, tracteurPlaque: v.immatriculation,
      semiRemorquePlaque: att ? vehicules.parId(att.semiRemorqueId)?.immatriculation : undefined,
      date: d.date, auditeur: d.inspecteur.trim(), resultats, conforme: !nonConformes.length,
      signataire: d.signataire.trim(), signeLe: maintenant().toISOString(), commentaire: d.commentaire?.trim() || undefined,
      libelles: Object.fromEntries(postesActifs.value.map(p => [p.code, { categorie: p.categorie, libelle: p.libelle }])),
      contreVisiteDe: origine?.id,
    }
    if (nonConformes.length) {
      insp.contreVisiteLe = new Date(new Date(d.date).getTime() + delaiContreVisiteJours.value * 86_400_000).toISOString().slice(0, 10) + 'T09:00:00'
      insp.ordreTravailId = useMaintenanceStore().creerOT({
        vehiculeId: v.id, vehiculePlaque: v.immatriculation, origine: 'constat_garage', declarePar: insp.auditeur, declareLe: d.date,
        symptome: `Inspection périodique ${insp.reference} : ${nonConformes.map(r => `${r.code} ${poste(insp, r.code).libelle} (${r.observation})`).join(' ; ')}.`,
        gravite: 'majeure', typeMaintenance: 'correctif',
      }, { debut: new Date(d.date).toISOString() })
    }
    inspections.value.unshift(insp)
    /* La contre-visite clôt l'inspection d'origine : conforme, elle lève la
       non-conformité ; non conforme, c'est elle qui attend à son tour sa contre-visite. */
    if (origine) origine.leveeParId = insp.id
    return { ok: true, id }
  }

  function ajouterPoste(p: { code: string; categorie: string; libelle: string }): { ok: boolean; motif?: string } {
    const code = p.code.trim()
    if (!code || !p.categorie.trim() || !p.libelle.trim()) return { ok: false, motif: 'Indiquez le code, la catégorie et le libellé du poste.' }
    if (grille.value.some(x => x.code === code)) return { ok: false, motif: 'Ce code existe déjà dans la grille.' }
    grille.value.push({ code, categorie: p.categorie.trim(), libelle: p.libelle.trim(), actif: true })
    return { ok: true }
  }
  /** Catégorie et libellé d'un poste : jamais vides. */
  function majPoste(code: string, data: { categorie?: string; libelle?: string }): { ok: boolean; motif?: string } {
    const p = grille.value.find(x => x.code === code); if (!p) return { ok: false, motif: 'Poste introuvable.' }
    if (data.categorie !== undefined && !data.categorie.trim()) return { ok: false, motif: 'La catégorie du poste ne peut pas être vide.' }
    if (data.libelle !== undefined && !data.libelle.trim()) return { ok: false, motif: 'Le libellé du poste ne peut pas être vide.' }
    if (data.categorie !== undefined) p.categorie = data.categorie.trim()
    if (data.libelle !== undefined) p.libelle = data.libelle.trim()
    return { ok: true }
  }
  /** Délai de contre-visite : un jour au moins. */
  function majDelaiContreVisite(jours: number): { ok: boolean; motif?: string } {
    if (!Number.isFinite(jours) || jours < 1) return { ok: false, motif: 'Le délai de contre-visite est d\'au moins 1 jour.' }
    delaiContreVisiteJours.value = Math.round(jours)
    return { ok: true }
  }
  function basculerPoste(code: string): { ok: boolean; motif?: string } {
    const p = grille.value.find(x => x.code === code); if (!p) return { ok: false, motif: 'Poste introuvable.' }
    if (p.actif !== false && postesActifs.value.length <= 1) return { ok: false, motif: 'Gardez au moins un poste actif.' }
    p.actif = p.actif === false
    return { ok: true }
  }

  return { grille, postesActifs, inspections, delaiContreVisiteJours, getById, nbNonConformes, poste, enAttenteContreVisite, aptitude, realiser, ajouterPoste, majPoste, majDelaiContreVisite, basculerPoste }
})
