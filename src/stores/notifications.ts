import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAbsenceStore } from './absences'
import { aujourdhuiISO } from '../utils/horloge'
import { useCalendrierStore } from './calendrier'

export interface Notification {
  id: string
  type: 'demande' | 'calendrier' | 'systeme'
  titre: string
  message: string
  lu: boolean
}

/**
 * Les notifications ne se saisissent pas : elles se déduisent de ce qui
 * est enregistré · demandes à traiter, demandes retournées sans suite,
 * jour férié qui approche.
 */
export const useNotificationStore = defineStore('notifications', () => {
  const absences = useAbsenceStore()
  const calendrier = useCalendrierStore()
  const lus = ref(new Set<string>())

  const liste = computed<Notification[]>(() => {
    const out: Notification[] = []

    absences.enAttente.forEach(d => {
      out.push({
        id: `att-${d.id}`,
        type: 'demande',
        titre: 'Demande à traiter',
        message: `${d.nom} · ${d.type}, ${d.debut} → ${d.fin}`,
        lu: lus.value.has(`att-${d.id}`),
      })
    })

    absences.liste
      .filter(d => d.statut === 'retourne')
      .forEach(d => {
        out.push({
          id: `ret-${d.id}`,
          type: 'demande',
          titre: 'Demande retournée',
          message: `${d.nom} · en attente de correction`,
          lu: lus.value.has(`ret-${d.id}`),
        })
      })

    const aujourdhui = aujourdhuiISO()
    const dans30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    calendrier.feries
      .filter(f => f.date >= aujourdhui && f.date <= dans30)
      .forEach(f => {
        out.push({
          id: `fer-${f.id}`,
          type: 'calendrier',
          titre: 'Jour férié à venir',
          message: `${f.libelle} · le ${f.date}`,
          lu: lus.value.has(`fer-${f.id}`),
        })
      })

    return out
  })

  const nonLues = computed(() => liste.value.filter(n => !n.lu).length)

  function marquerLu(id: string) { lus.value = new Set(lus.value).add(id) }
  function toutMarquerLu() {
    const s = new Set(lus.value)
    liste.value.forEach(n => s.add(n.id))
    lus.value = s
  }

  return { liste, nonLues, marquerLu, toutMarquerLu }
})
