<template>
  <template v-if="visible">
    <button type="button" :class="cls.btnOutline" class="!py-1.5 !text-[12px]" @click="ouvert = true">
      <Upload class="w-3.5 h-3.5" /> Importer des commandes
    </button>
    <ImportCsvModal
      v-if="ouvert"
      titre="Importer des commandes"
      import-id="commandes"
      :champs="CHAMPS"
      :apercu-colonnes="COLONNES_APERCU"
      :modele="MODELE"
      :valider="valider"
      @close="fermer"
      @importer="lignes => importer(lignes as unknown as LigneCommande[])"
    />
  </template>
</template>

<script setup lang="ts">
/**
 * Import des commandes à livrer depuis le système de gestion de l'entreprise :
 * bouton et fenêtre d'import, affichés seulement si l'import est un mode
 * d'arrivée coché dans les paramètres de la planification et si le rôle
 * connecté est habilité à planifier. Prêt à placer dans la section des
 * commandes à livrer.
 */
import { computed, ref } from 'vue'
import { Upload } from '@lucide/vue'
import ImportCsvModal from '../ui/ImportCsvModal.vue'
import type { ChampImport, LigneValidee } from '../ui/ImportCsvModal.vue'
import { IMPORTS } from '../../stores/imports'
import { useCommandesStore } from '../../stores/commandes'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import { useClientsStore, type CanalNotification } from '../../stores/clients'
import { useSitesStore } from '../../stores/sites'
import { useAuthStore } from '../../stores/auth'
import type { Commande } from '../../types'
import * as cls from '../../lib/formClasses'

const commandes = useCommandesStore()
const params = useParametresPlanificationStore()
const clients = useClientsStore()
const sites = useSitesStore()
const auth = useAuthStore()

const visible = computed(() => params.parametres.importCommandes && params.peutPiloter(auth.role))
const ouvert = ref(false)

const CHAMPS: ChampImport[] = IMPORTS.commandes.champs
const MODELE = IMPORTS.commandes.champs.map(c => c.libelle)
const COLONNES_APERCU = [
  { cle: 'referenceExterne', libelle: 'Référence' },
  { cle: 'destinataire', libelle: 'Destinataire' },
  { cle: 'dateSouhaitee', libelle: 'Date souhaitée' },
  { cle: 'contenu', libelle: 'Contenu' },
  { cle: 'poidsKg', libelle: 'Poids (kg)' },
]

type LigneCommande = Omit<Commande, 'id' | 'statut' | 'createdAt' | 'origine'>

const norm = (x: string) => x.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const nombre = (x: string) => Number(x.replace(/\s/g, '').replace(',', '.'))
function canal(x: string): CanalNotification | undefined | null {
  const v = norm(x).replace(/[^a-z]/g, '')
  if (!v) return undefined
  if (v === 'sms') return 'sms'
  if (v === 'email' || v === 'mail') return 'email'
  if (v.includes('sms') && v.includes('mail') || v === 'lesdeux') return 'sms_email'
  return null
}

/* Doublons dans le fichier : la première ligne d'une référence est gardée. */
const premiere = new Map<string, Record<string, string>>()
function fermer() { ouvert.value = false; premiere.clear() }

function valider(ligne: Record<string, string>, mapping: Record<string, string>): LigneValidee {
  const val = (c: string) => (mapping[c] ? (ligne[mapping[c]!] ?? '').trim() : '')
  const ref = val('referenceExterne')
  if (params.parametres.referenceExterneObligatoire && !ref) return { valide: false, motif: `${params.parametres.libelleReferenceExterne} manquant` }
  if (ref && commandes.referenceConnue(ref)) return { valide: false, motif: `Commande déjà enregistrée (${ref})` }
  if (ref) {
    const cle = norm(ref)
    const deja = premiere.get(cle)
    if (deja && deja !== ligne) return { valide: false, motif: `Référence en double dans le fichier (${ref})` }
    premiere.set(cle, ligne)
  }

  const nomSite = val('site')
  const site = nomSite ? sites.sites.find(s => norm(s.nom) === norm(nomSite) || norm(s.code) === norm(nomSite)) : undefined
  if (nomSite && !site) return { valide: false, motif: `Site non reconnu « ${nomSite} »` }
  const destinataire = site ? site.nom : val('destinataire')
  if (!destinataire) return { valide: false, motif: 'Destinataire manquant' }
  const adresse = val('adresse') || (site ? site.nom : '')
  if (!adresse) return { valide: false, motif: 'Adresse de livraison manquante' }
  const date = val('dateSouhaitee')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { valide: false, motif: `Date souhaitée invalide « ${date} » (format AAAA-MM-JJ)` }
  const contenu = val('contenu')
  if (!contenu) return { valide: false, motif: 'Contenu manquant' }
  const poids = nombre(val('poidsKg'))
  if (!val('poidsKg') || !Number.isFinite(poids) || poids <= 0) return { valide: false, motif: 'Poids manquant ou invalide' }
  const vol = val('volumeM3') ? nombre(val('volumeM3')) : undefined
  if (vol !== undefined && (!Number.isFinite(vol) || vol < 0)) return { valide: false, motif: `Volume invalide « ${val('volumeM3')} »` }
  const unites = val('nombreUnites') ? nombre(val('nombreUnites')) : undefined
  if (unites !== undefined && (!Number.isInteger(unites) || unites < 0)) return { valide: false, motif: `Nombre d'unités invalide « ${val('nombreUnites')} »` }
  const c = canal(val('canal'))
  if (c === null) return { valide: false, motif: `Canal de notification non reconnu « ${val('canal')} »` }
  /* Qui paie le fret : colonne facultative, sinon le réglage par défaut. */
  const fretBrut = norm(val('fretALaCharge'))
  const fret = !fretBrut ? undefined : fretBrut.startsWith('ordonnateur') ? 'ordonnateur' as const : fretBrut.startsWith('destinataire') ? 'destinataire' as const : null
  if (fret === null) return { valide: false, motif: `Fret à la charge de : valeur non reconnue « ${val('fretALaCharge')} » (ordonnateur ou destinataire)` }
  const tel = val('telephone'), mail = val('email')
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { valide: false, motif: `E-mail invalide « ${mail} »` }
  if (tel && !/^[+0-9 ().-]{6,}$/.test(tel)) return { valide: false, motif: `Téléphone invalide « ${tel} »` }

  const pos = site
    ? { lat: site.lat, lng: site.lng }
    : { lat: -18.8792 + (Math.random() - 0.5) * 0.6, lng: 47.5079 + (Math.random() - 0.5) * 0.6 }
  const l: LigneCommande = {
    destinataire, adresseLivraison: adresse, siteId: site?.id, ...pos, contenu, poidsKg: poids, volumeM3: vol, nombreUnites: unites,
    dateSouhaitee: date, referenceExterne: ref || undefined, commentaire: val('commentaire') || undefined,
    ordonnateurExterne: val('ordonnateur') || undefined, fretALaCharge: fret,
    canalNotification: site ? undefined : (c ?? clients.canalPour(destinataire)),
    telephoneDestinataire: site ? undefined : tel || undefined, emailDestinataire: site ? undefined : mail || undefined,
  }
  return { valide: true, donnees: l as unknown as Record<string, unknown> }
}

function importer(lignes: LigneCommande[]) {
  commandes.importer(lignes)
  premiere.clear()
  /* La fenêtre reste ouverte pour que le rapport d'import se lise. */
}
</script>
