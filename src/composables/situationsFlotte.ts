import { computed } from 'vue'
import { useVehiculeStore } from '../stores/vehicules'
import { useTelematiqueStore } from '../stores/telematique'
import { useAlertesStore } from '../stores/alertes'

/**
 * Situation de chaque tracteur en temps réel (FMS-GP-05) : en mission, à
 * l'arrêt, en alerte, hors zone, signal perdu. Calculée une seule fois ici et
 * reprise par la carte temps réel et la vue d'ensemble.
 */
export type Situation = 'mission' | 'arret' | 'alerte' | 'hors_zone' | 'signal'
export const LIB_SITUATION: Record<Situation, string> = {
  mission: 'En mission', arret: "À l'arrêt", alerte: 'En alerte', hors_zone: 'Hors zone', signal: 'Signal perdu',
}
export const CLS_SITUATION: Record<Situation, string> = {
  mission: 'bg-success-bg text-success', arret: 'bg-neutral-bg text-neutral', alerte: 'bg-danger-bg text-danger',
  hors_zone: 'bg-warning-bg text-warning', signal: 'bg-info-bg text-info',
}
export const SITUATIONS = Object.keys(LIB_SITUATION) as Situation[]

export function useSituationsFlotte() {
  const vehicules = useVehiculeStore()
  const telematique = useTelematiqueStore()
  const alertes = useAlertesStore()

  const parVehicule = computed<Record<string, Set<Situation>>>(() => {
    const acc: Record<string, Set<Situation>> = {}
    vehicules.tracteurs.filter(t => t.statut !== 'sorti').forEach(t => {
      const s = new Set<Situation>()
      const pos = vehicules.positions[t.id]
      const sansBoitier = !vehicules.aBoitier(t.id) || !pos
      const signal = !sansBoitier && vehicules.statutsOp[t.id] === 'signal_perdu'
      if (signal) s.add('signal')
      if (telematique.voyageEnCoursDe(t.id)) s.add('mission')
      if (!sansBoitier && !signal && (vehicules.statutsOp[t.id] !== 'en_mouvement' || pos!.vitesse === 0)) s.add('arret')
      if (!sansBoitier && !signal && telematique.horsZone(t.id)) s.add('hors_zone')
      if (alertes.enCoursDuVehicule(t.id).length) s.add('alerte')
      acc[t.id] = s
    })
    return acc
  })
  const compte = computed(() => Object.fromEntries(SITUATIONS.map(s => [s, Object.values(parVehicule.value).filter(x => x.has(s)).length])) as Record<Situation, number>)
  const situationsDe = (vehiculeId: string) => [...(parVehicule.value[vehiculeId] ?? [])]
  const dans = (vehiculeId: string, s: Situation | '') => !s || !!parVehicule.value[vehiculeId]?.has(s)
  return { parVehicule, compte, situationsDe, dans }
}
