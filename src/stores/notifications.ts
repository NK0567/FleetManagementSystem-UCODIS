import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAbsenceStore } from './absences'
import { aujourdhuiISO } from '../utils/horloge'
import { useCalendrierStore } from './calendrier'
import { usePneusStore } from './pneus'
import { useCarburantStore } from './carburant'
import { useCartesCarburantStore } from './cartesCarburant'

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
  const pneus = usePneusStore()
  const carburant = useCarburantStore()
  const cartes = useCartesCarburantStore()
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

    /* Pneus hors seuil (pression, sculpture) ou à faire pivoter. */
    carburant.anomalies.forEach(r => {
      const id = `plein-${r.id}`
      out.push({ id, type: 'systeme', titre: 'Plein à qualifier', message: `${r.vehiculePlaque} · ${r.litres} L à ${r.lieu} : ${r.controles.filter(c => !c.ok).map(c => c.libelle.toLowerCase()).join(', ')}`, lu: lus.value.has(id) })
    })
    carburant.ecartsAQualifier.forEach(p => {
      const id = `ecart-${p.id}`
      out.push({ id, type: 'systeme', titre: 'Écart de consommation à qualifier', message: `${p.vehiculePlaque} · ${p.ecartPct > 0 ? '+' : ''}${p.ecartPct} % sur la référence`, lu: lus.value.has(id) })
    })
    cartes.enDepassement.forEach(t => {
      const id = `tx-${t.id}`
      out.push({ id, type: 'systeme', titre: 'Carte carburant : limite dépassée', message: `${t.station}, ${t.litres} L : ${cartes.depassements(t).join(', ')}`, lu: lus.value.has(id) })
    })

    pneus.alertes.forEach(({ pneu, motifs }) => {
      out.push({
        id: `pneu-${pneu.id}-${motifs.join('|')}`,
        type: 'systeme',
        titre: 'Alerte pneumatique',
        message: `${pneu.vehiculePlaque ?? ''} · ${pneu.numeroSerie} : ${motifs.join(', ')}`,
        lu: lus.value.has(`pneu-${pneu.id}-${motifs.join('|')}`),
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
