import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ChampImport } from '../components/ui/ImportCsvModal.vue'

/**
 * Imports de reprise de l'existant (FMS-PA-07) : véhicules, personnes, pleins
 * et historique de maintenance. Les champs attendus sont définis une seule
 * fois ici, et chaque écran d'import les reprend. L'entreprise règle pour
 * chaque champ l'intitulé de colonne de son fichier source ; à l'import, la
 * colonne qui porte cet intitulé est reconnue sans manipulation.
 */
export type ImportId = 'vehicules' | 'personnes' | 'pleins' | 'maintenance' | 'commandes'

export const IMPORTS: Record<ImportId, { libelle: string; ecran: string; champs: ChampImport[] }> = {
  vehicules: {
    libelle: 'Véhicules', ecran: 'Parc véhicules, Véhicules',
    champs: [
      { cle: 'immatriculation', libelle: 'Immatriculation', requis: true },
      { cle: 'vin', libelle: 'VIN', requis: true },
      { cle: 'type', libelle: 'Type', requis: true },
      { cle: 'marque', libelle: 'Marque', requis: true },
      { cle: 'modele', libelle: 'Modèle', requis: true },
      { cle: 'categorie', libelle: 'Catégorie', requis: false },
      { cle: 'carburant', libelle: 'Carburant', requis: false },
      { cle: 'chargeMaxKg', libelle: 'Charge max (kg)', requis: false },
      { cle: 'site', libelle: 'Base', requis: true },
    ],
  },
  personnes: {
    libelle: 'Personnes', ecran: 'Parc véhicules, Conducteurs',
    champs: [
      { cle: 'prenom', libelle: 'Prénom', requis: true },
      { cle: 'nom', libelle: 'Nom', requis: true },
      { cle: 'fonction', libelle: 'Fonction', requis: true },
      { cle: 'cin', libelle: "Pièce d'identité", requis: true },
      { cle: 'telephone', libelle: 'Téléphone', requis: false },
      { cle: 'dateEntree', libelle: "Date d'entrée", requis: false },
    ],
  },
  pleins: {
    libelle: 'Pleins de carburant', ecran: 'Exploitation, Carburant',
    champs: [
      { cle: 'plaque', libelle: 'Immatriculation véhicule', requis: true },
      { cle: 'date', libelle: 'Date (AAAA-MM-JJ HH:MM)', requis: true },
      { cle: 'litres', libelle: 'Litres', requis: true },
      { cle: 'km', libelle: 'Kilométrage', requis: true },
      { cle: 'prixLitre', libelle: 'Prix au litre', requis: true },
      { cle: 'lieu', libelle: 'Station', requis: true },
      { cle: 'voyage', libelle: 'Voyage', requis: false },
      { cle: 'chauffeur', libelle: 'Conducteur', requis: false, autres: ['Chauffeur'] },
      { cle: 'plein', libelle: 'Plein complet (oui/non)', requis: false },
    ],
  },
  maintenance: {
    libelle: 'Historique de maintenance', ecran: 'Maintenance, Ordres de travail',
    champs: [
      { cle: 'plaque', libelle: 'Immatriculation véhicule', requis: true },
      { cle: 'date', libelle: 'Date', requis: true },
      { cle: 'description', libelle: 'Description', requis: true },
      { cle: 'cout', libelle: 'Coût', requis: false },
      { cle: 'sousSysteme', libelle: 'Sous-système', requis: false },
    ],
  },
  commandes: {
    libelle: 'Commandes à livrer', ecran: 'Planification, Commandes à livrer',
    champs: [
      { cle: 'referenceExterne', libelle: 'Référence de commande', requis: false },
      { cle: 'destinataire', libelle: 'Destinataire', requis: true, autres: ['Client'] },
      { cle: 'site', libelle: 'Site destinataire (transfert)', requis: false },
      { cle: 'adresse', libelle: 'Adresse de livraison', requis: true },
      { cle: 'dateSouhaitee', libelle: 'Date souhaitée (AAAA-MM-JJ)', requis: true },
      { cle: 'contenu', libelle: 'Contenu', requis: true },
      { cle: 'nombreUnites', libelle: "Nombre d'unités", requis: false },
      { cle: 'poidsKg', libelle: 'Poids (kg)', requis: true },
      { cle: 'volumeM3', libelle: 'Volume (m³)', requis: false },
      { cle: 'ordonnateur', libelle: 'Client qui confie les marchandises', requis: false },
      { cle: 'fretALaCharge', libelle: 'Fret à la charge de (ordonnateur ou destinataire)', requis: false, autres: ['Fret à la charge de'] },
      { cle: 'canal', libelle: 'Notifications (SMS, e-mail, les deux)', requis: false },
      { cle: 'telephone', libelle: 'Téléphone du destinataire', requis: false },
      { cle: 'email', libelle: 'E-mail du destinataire', requis: false },
      { cle: 'commentaire', libelle: 'Commentaire', requis: false },
    ],
  },
}

const CLE = 'fms-ucodis-correspondances-import'
export const normaliserIntitule = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')

export const useImportsStore = defineStore('imports', () => {
  /** Intitulé de la colonne source, par import et par champ. Vide : l'intitulé attendu est le libellé du champ. */
  const correspondances = ref<Record<ImportId, Record<string, string>>>({ vehicules: {}, personnes: {}, pleins: {}, maintenance: {}, commandes: {} })
  try { const b = localStorage.getItem(CLE); if (b) Object.assign(correspondances.value, JSON.parse(b)) } catch { /* vide */ }
  watch(correspondances, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  const intitule = (id: ImportId, cle: string) => correspondances.value[id][cle]?.trim() || IMPORTS[id].champs.find(c => c.cle === cle)?.libelle || cle

  /** Deux champs ne peuvent pas lire la même colonne du fichier source. */
  function definir(id: ImportId, cle: string, valeur: string): { ok: boolean; motif?: string } {
    const v = valeur.trim()
    if (v) {
      const doublon = IMPORTS[id].champs.find(c => c.cle !== cle && normaliserIntitule(intitule(id, c.cle)) === normaliserIntitule(v))
      if (doublon) return { ok: false, motif: `L'intitulé « ${v} » est déjà celui du champ ${doublon.libelle}.` }
    }
    if (v) correspondances.value[id][cle] = v
    else delete correspondances.value[id][cle]
    return { ok: true }
  }

  /** Reconnaissance des colonnes d'un fichier : intitulé réglé d'abord, libellé du champ ensuite. */
  function reconnaitre(id: ImportId, entetes: string[]): Record<string, string> {
    const out: Record<string, string> = {}
    IMPORTS[id].champs.forEach(c => {
      const voulus = [intitule(id, c.cle), c.libelle, ...(c.autres ?? [])].map(normaliserIntitule)
      const trouve = entetes.find(h => voulus.includes(normaliserIntitule(h)))
      if (trouve) out[c.cle] = trouve
    })
    return out
  }

  /** Mémorise la correspondance faite à la main lors d'un import. */
  function memoriser(id: ImportId, mapping: Record<string, string>) {
    Object.entries(mapping).forEach(([cle, entete]) => {
      if (!entete) return
      const c = IMPORTS[id].champs.find(x => x.cle === cle)
      if (c && normaliserIntitule(entete) !== normaliserIntitule(c.libelle)) correspondances.value[id][cle] = entete
      else delete correspondances.value[id][cle]
    })
  }

  /** En-têtes du modèle de fichier : les intitulés réglés par l'entreprise. */
  const modele = (id: ImportId) => IMPORTS[id].champs.map(c => intitule(id, c.cle))

  function reinitialiser(id: ImportId) { correspondances.value[id] = {} }

  return { correspondances, intitule, definir, reconnaitre, memoriser, modele, reinitialiser }
})
