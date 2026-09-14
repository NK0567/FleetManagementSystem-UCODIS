import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { aujourdhuiISO } from '../utils/horloge'

export interface JourTravail {
  actif: boolean
  debut: string
  fin: string
  pauseActive: boolean
  pauseDebut: string
  pauseFin: string
}

export interface JourFerie {
  id: string
  date: string
  libelle: string
  recurrent: boolean
}

const LIBELLES_JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

/**
 * Horaires de journée par défaut · aucun document UCODIS ne les fixe
 * pour le personnel sédentaire. Le samedi est ouvré car le transport
 * longue distance roule ce jour-là ; le dimanche est au repos.
 */
function jourParDefaut(actif: boolean): JourTravail {
  return { actif, debut: '07:30', fin: '16:30', pauseActive: true, pauseDebut: '12:00', pauseFin: '13:00' }
}

export const useCalendrierStore = defineStore('calendrier', () => {
  const jours = ref<JourTravail[]>([
    jourParDefaut(true), jourParDefaut(true), jourParDefaut(true),
    jourParDefaut(true), jourParDefaut(true), jourParDefaut(true),
    { ...jourParDefaut(false), pauseActive: false },
  ])

  /** Conservé pour compatibilité : simple liste de booléens, jour par jour. */
  const joursOuvres = computed(() => jours.value.map(j => j.actif))
  const nbJoursOuvres = computed(() => jours.value.filter(j => j.actif).length)

  function toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
  }
  function formatMinutes(total: number): string {
    const h = Math.floor(total / 60)
    const m = total % 60
    return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
  }
  /** Minutes effectives d'un jour (temps de travail moins la pause). */
  function minutesEffectives(j: JourTravail): number {
    if (!j.actif) return 0
    const travail = toMinutes(j.fin) - toMinutes(j.debut)
    const pause = j.pauseActive ? toMinutes(j.pauseFin) - toMinutes(j.pauseDebut) : 0
    return Math.max(0, travail - pause)
  }
  const minutesHebdo = computed(() => jours.value.reduce((n, j) => n + minutesEffectives(j), 0))

  function basculerJour(index: number) { jours.value[index]!.actif = !jours.value[index]!.actif }
  function bascculerPause(index: number) { jours.value[index]!.pauseActive = !jours.value[index]!.pauseActive }

  /** Jours fériés malgaches. Le transport longue distance s'y arrête. */
  const feries = ref<JourFerie[]>([
    { id: 'f1',  date: '2026-01-01', libelle: "Jour de l'An",             recurrent: true },
    { id: 'f2',  date: '2026-03-08', libelle: 'Journée de la femme',      recurrent: true },
    { id: 'f3',  date: '2026-03-29', libelle: 'Fête des Martyrs',         recurrent: true },
    { id: 'f4',  date: '2026-04-06', libelle: 'Lundi de Pâques',          recurrent: false },
    { id: 'f5',  date: '2026-05-01', libelle: 'Fête du Travail',          recurrent: true },
    { id: 'f6',  date: '2026-05-14', libelle: 'Ascension',                recurrent: false },
    { id: 'f7',  date: '2026-05-25', libelle: "Journée de l'Afrique",     recurrent: true },
    { id: 'f8',  date: '2026-06-26', libelle: "Fête de l'Indépendance",   recurrent: true },
    { id: 'f9',  date: '2026-08-15', libelle: 'Assomption',               recurrent: true },
    { id: 'f10', date: '2026-11-01', libelle: 'Toussaint',                recurrent: true },
    { id: 'f11', date: '2026-12-25', libelle: 'Noël',                     recurrent: true },
  ])

  function estFerie(date: string) {
    return feries.value.find(f => f.date === date) ?? null
  }
  let prochainFerieId = feries.value.length + 1
  function creerFerie(f: Omit<JourFerie, 'id'>) {
    feries.value.push({ ...f, id: `ferie-perso-${prochainFerieId++}` })
  }
  function mettreAJourFerie(id: string, patch: Partial<Omit<JourFerie, 'id'>>) {
    const f = feries.value.find(x => x.id === id)
    if (f) Object.assign(f, patch)
  }
  function supprimerFerie(id: string) {
    feries.value = feries.value.filter(f => f.id !== id)
  }

  /* Traçabilité de la dernière modification, comme sur les autres projets. */
  const majLe = ref('2026-08-28')
  const majPar = ref('Faniry Rakotoarisoa')
  function enregistrer(par: string) {
    majLe.value = aujourdhuiISO()
    majPar.value = par
  }

  return {
    jours, LIBELLES_JOURS, joursOuvres, nbJoursOuvres, feries, majLe, majPar,
    toMinutes, formatMinutes, minutesEffectives, minutesHebdo,
    basculerJour, bascculerPause, estFerie, creerFerie, mettreAJourFerie, supprimerFerie, enregistrer,
  }
})
