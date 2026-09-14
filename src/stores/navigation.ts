import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Onglet actif de la barre de navigation, et onglet actif de l'écran Entités/Organigramme. */
export const useNavigationStore = defineStore('navigation', () => {
  const moduleActif = ref('administration')

  /** Partagé entre les écrans Entités et Organigramme : même source, deux points d'entrée. */
  const activeEntiteTab = ref<'hierarchie' | 'organigramme' | 'liste' | 'attente'>('hierarchie')
  function setModule(cle: string) {
    moduleActif.value = cle
  }
  function setEntiteTab(tab: typeof activeEntiteTab.value) {
    activeEntiteTab.value = tab
  }

  return { moduleActif, setModule, activeEntiteTab, setEntiteTab }
})
