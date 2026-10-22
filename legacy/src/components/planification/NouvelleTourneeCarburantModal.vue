<script setup lang="ts">
/**
 * Création d'une tournée de carburant : dépôt de chargement, date, date de
 * validité, région, commandes de carburant à livrer et camions (véhicule et
 * citerne). Le volume à livrer, la capacité des camions et la vérification
 * de la répartition se mettent à jour à chaque choix.
 */
import { ref, computed, watch } from 'vue'
import { CheckCircle2, Plus, Truck, X, AlertTriangle } from '@lucide/vue'
import CreateModalShell from '../shared/CreateModalShell.vue'
import * as F from '../../lib/formClasses'
import { useLivraisonCarburantStore } from '../../stores/livraisonCarburant'
import { useCommandesStore } from '../../stores/commandes'
import { useVehiculeStore } from '../../stores/vehicules'
import { useSitesStore } from '../../stores/sites'
import { fmtL } from '../../lib/volume15'
import type { Commande } from '../../types'

const emit = defineEmits<{ close: []; cree: [id: string] }>()
const store = useLivraisonCarburantStore()
const commandes = useCommandesStore()
const vehicules = useVehiculeStore()
const sites = useSitesStore()

const form = ref({ depotId: '', datePlanifiee: '', dateValidite: '', region: '', confirmationRequise: true })
const cochees = ref<string[]>([])
const camions = ref<{ vehiculeId: string; citerneId: string }[]>([])
const choixCamion = ref({ vehiculeId: '', citerneId: '' })
const erreur = ref('')
const erreurCamion = ref('')

/* Le dépôt choisi filtre les commandes : une tournée se charge à un seul dépôt ; la région choisie aussi. */
const commandesProposees = computed(() => store.commandesAPlanifier.filter(c => (!form.value.depotId || !c.depotId || c.depotId === form.value.depotId)
  && (!form.value.region || !store.regionCommande(c) || store.regionCommande(c) === form.value.region)))
watch([() => form.value.depotId, () => form.value.region], () => { cochees.value = cochees.value.filter(id => commandesProposees.value.some(c => c.id === id)) })
const depotNom = (id?: string) => (id ? sites.getById(id)?.nom : undefined) ?? '-'
const commandesChoisies = computed(() => cochees.value.map(id => commandes.getById(id)).filter((c): c is Commande => !!c))

const tracteurs = computed(() => store.tracteursDisponibles().filter(t => !camions.value.some(c => c.vehiculeId === t.id)))
const citernes = computed(() => store.citernesDisponibles(undefined, choixCamion.value.vehiculeId || undefined).filter(c => !camions.value.some(x => x.citerneId === c.id)))
/* La citerne attelée au camion choisi est proposée d'office. */
watch(() => choixCamion.value.vehiculeId, id => {
  const at = id ? vehicules.attelageActif(id) : null
  if (at && citernes.value.some(c => c.id === at.semiRemorqueId)) choixCamion.value.citerneId = at.semiRemorqueId
})
function ajouterCamion() {
  erreurCamion.value = ''
  const r = store.controlerCamion(choixCamion.value.vehiculeId, choixCamion.value.citerneId, form.value.datePlanifiee || '')
  if (!r.ok) { erreurCamion.value = r.motif ?? ''; return }
  camions.value = [...camions.value, { ...choixCamion.value }]
  choixCamion.value = { vehiculeId: '', citerneId: '' }
}
function retirerCamion(i: number) { camions.value = camions.value.filter((_, k) => k !== i) }
const plaque = (id: string) => vehicules.parId(id)?.immatriculation ?? id
const compartimentsDe = (citerneId: string) => (vehicules.parId(citerneId)?.compartiments ?? []).map(c => fmtL(c.volumeL)).join(' · ')

const verification = computed(() => store.verifier(commandesChoisies.value, camions.value))

function creer() {
  erreur.value = ''
  const r = store.creerTournee({ ...form.value, commandeIds: cochees.value, camions: camions.value })
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  emit('cree', r.id!)
}
</script>

<template>
  <CreateModalShell title="Nouvelle tournée de carburant" banner-label="Planification · Ordres de transport" create-label="Créer la tournée"
                    :save-error="erreur || null" @close="emit('close')" @create="creer">
    <template #form>
      <div class="max-w-4xl mx-auto w-full px-6 py-6 flex flex-col gap-5">
        <div class="grid grid-cols-4 gap-3 max-md:grid-cols-2 max-sm:grid-cols-1">
          <div :class="F.field">
            <label :class="F.fieldLabel">Dépôt de chargement *</label>
            <select v-model="form.depotId" :class="F.fieldSelect">
              <option value="">Choisir…</option>
              <option v-for="d in store.depots" :key="d.id" :value="d.id">{{ d.nom }}{{ d.proprietaireTiers ? ` (${d.proprietaireTiers})` : '' }}</option>
            </select>
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Date prévue *</label>
            <input v-model="form.datePlanifiee" type="datetime-local" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Date de validité *</label>
            <input v-model="form.dateValidite" type="date" :class="F.fieldInput" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Région *</label>
            <select v-model="form.region" :class="F.fieldSelect">
              <option value="">Choisir…</option>
              <option v-for="r in store.regions" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>
        </div>
        <label class="flex items-center gap-2 text-[12px] text-foreground cursor-pointer w-fit">
          <input v-model="form.confirmationRequise" type="checkbox" class="w-4 h-4 accent-primary" />
          Demander à chaque destinataire de confirmer sa disponibilité
        </label>

        <!-- Commandes de carburant à livrer -->
        <div>
          <p class="text-[13px] font-semibold text-foreground mb-2">Commandes de carburant à livrer ({{ commandesProposees.length }})</p>
          <p v-if="!commandesProposees.length" class="text-[12px] text-muted-foreground italic">Aucune commande de carburant à planifier.</p>
          <table v-else class="w-full border-collapse text-[12px]">
            <thead><tr class="border-b border-border text-left text-[11px] text-muted-foreground">
              <th class="py-1.5 w-7"></th><th class="py-1.5">Client</th><th class="py-1.5">Lieu de livraison</th><th class="py-1.5">Produit</th>
              <th class="py-1.5 text-right">Volume</th><th class="py-1.5">Date souhaitée</th><th class="py-1.5">Dépôt</th><th class="py-1.5">Pompe</th>
            </tr></thead>
            <tbody>
              <tr v-for="c in commandesProposees" :key="c.id" class="border-b border-border/60">
                <td class="py-1.5"><input v-model="cochees" type="checkbox" :value="c.id" class="w-4 h-4 accent-primary" /></td>
                <td class="py-1.5 text-foreground">{{ c.destinataire }} <span class="font-mono text-muted-foreground">{{ c.referenceExterne }}</span><span v-if="commandes.estRepartie(c.id)" class="block text-[11px] text-info">Reste de la commande</span></td>
                <td class="py-1.5 text-muted-foreground">{{ c.adresseLivraison }}</td>
                <td class="py-1.5">{{ c.produit }}</td>
                <td class="py-1.5 text-right">{{ fmtL(c.volumeL) }}</td>
                <td class="py-1.5">{{ new Date(c.dateSouhaitee).toLocaleDateString('fr-FR') }}</td>
                <td class="py-1.5 text-muted-foreground">{{ depotNom(c.depotId) }}</td>
                <td class="py-1.5">{{ store.pompeExigee(c) ? 'Exigée' : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Camions -->
        <div>
          <p class="text-[13px] font-semibold text-foreground mb-2">Camions</p>
          <div v-for="(c, i) in camions" :key="c.vehiculeId" class="flex items-center gap-2.5 rounded-md border border-border px-3 py-2 mb-1.5 text-[12px]">
            <Truck class="w-4 h-4 text-primary shrink-0" />
            <div class="flex-1 min-w-0">
              <span class="font-mono font-semibold text-foreground">{{ plaque(c.vehiculeId) }}</span>
              <span class="text-muted-foreground"> · citerne <span class="font-mono">{{ plaque(c.citerneId) }}</span> ({{ compartimentsDe(c.citerneId) }}) · {{ store.conducteurDe(c.vehiculeId)?.nom }}</span>
              <span v-if="store.camionPompe(c.vehiculeId, c.citerneId)" class="text-muted-foreground"> · pompe</span>
            </div>
            <span class="text-muted-foreground shrink-0">{{ fmtL(store.capaciteCiterne(c.citerneId)) }}</span>
            <button class="bg-transparent border-0 cursor-pointer text-muted-foreground hover:text-danger p-0.5 shrink-0" title="Retirer ce camion" @click="retirerCamion(i)"><X class="w-4 h-4" /></button>
          </div>
          <div class="flex items-end gap-2 flex-wrap">
            <div :class="F.field">
              <label :class="F.fieldLabel">Camion</label>
              <select v-model="choixCamion.vehiculeId" :class="F.fieldSelect" class="!w-[230px]">
                <option value="">Choisir…</option>
                <option v-for="t in tracteurs" :key="t.id" :value="t.id">{{ t.immatriculation }} · {{ store.conducteurDe(t.id)?.nom ?? 'sans conducteur' }}</option>
              </select>
            </div>
            <div :class="F.field">
              <label :class="F.fieldLabel">Citerne</label>
              <select v-model="choixCamion.citerneId" :class="F.fieldSelect" class="!w-[260px]">
                <option value="">Choisir…</option>
                <option v-for="c in citernes" :key="c.id" :value="c.id">{{ c.immatriculation }} · {{ compartimentsDe(c.id) }}</option>
              </select>
            </div>
            <button :class="F.btnOutline" @click="ajouterCamion"><Plus class="w-4 h-4" /> Ajouter le camion</button>
          </div>
          <p v-if="erreurCamion" class="text-[12px] text-danger mt-1.5">{{ erreurCamion }}</p>
        </div>

        <!-- Volume, capacité et vérification -->
        <div class="rounded-lg border border-border px-4 py-3">
          <div class="grid grid-cols-2 gap-3 text-[12px] mb-2">
            <div><span class="text-muted-foreground">Volume total à livrer : </span><span class="font-semibold text-foreground">{{ fmtL(verification.volumeTotal) }}</span></div>
            <div><span class="text-muted-foreground">Capacité totale des camions : </span><span class="font-semibold text-foreground">{{ fmtL(verification.capaciteTotale) }}</span></div>
          </div>
          <p v-if="verification.repartissable" class="text-[12px] text-success flex items-center gap-1.5"><CheckCircle2 class="w-4 h-4" /> La tournée peut être répartie.</p>
          <p v-for="m in verification.motifs" :key="m" class="text-[12px] text-danger flex items-start gap-1.5"><AlertTriangle class="w-4 h-4 shrink-0 mt-px" /> {{ m }}</p>
        </div>
      </div>
    </template>
  </CreateModalShell>
</template>
