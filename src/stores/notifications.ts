import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAbsenceStore } from './absences'
import { aujourdhuiISO, maintenantMs, isoJour } from '../utils/horloge'
import { useCalendrierStore } from './calendrier'
import { useAlertesStore } from './alertes'

export interface Notification {
  id: string
  type: 'demande' | 'calendrier' | 'systeme'
  titre: string
  message: string
  lu: boolean
  /** Clé de l'alerte, pour l'ouvrir dans l'écran Alertes. */
  alerte?: string
  /** Écran où se traite l'élément (demande d'absence), et l'élément à y ouvrir. */
  route?: string
  query?: Record<string, string>
}

/**
 * Les notifications ne se saisissent pas : elles se déduisent de ce qui
 * est enregistré · demandes à traiter, demandes retournées sans suite,
 * jour férié qui approche.
 */
export const useNotificationStore = defineStore('notifications', () => {
  const absences = useAbsenceStore()
  const calendrier = useCalendrierStore()
  const alertes = useAlertesStore()
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
        route: 'admin-demandes', query: { demande: String(d.id) },
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
          route: 'admin-demandes', query: { demande: String(d.id) },
        })
      })

    const aujourdhui = aujourdhuiISO()
    const dans30 = isoJour(new Date(maintenantMs() + 30 * 86400000))
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

    /* Alertes en cours des sous-modules : traitées dans l'écran Alertes. */
    alertes.enCours.forEach(e => {
      out.push({ id: e.cle, type: 'systeme', titre: e.escaladeeLe ? `${e.titre} (escaladée)` : e.titre, message: e.message, lu: lus.value.has(e.cle), alerte: e.cle })
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
