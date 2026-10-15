<script setup lang="ts">
/** Onglet Carburant de la configuration : seuils des contrôles automatiques,
 *  causes d'écart, retenue, consommations de référence, émissions et
 *  capacités des réservoirs. */
import { ref, computed } from 'vue'
import { Fuel, Gauge, Leaf, ListChecks, ShieldCheck, Trash2, Undo2 } from '@lucide/vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import { useCarburantStore } from '../../stores/carburant'
import { useTrajetsStore } from '../../stores/trajets'
import { useVehiculeStore } from '../../stores/vehicules'
import { useEcoconduiteStore } from '../../stores/ecoconduite'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = useCarburantStore()
const trajets = useTrajetsStore()
const vehicules = useVehiculeStore()
const eco = useEcoconduiteStore()
const p = store.parametres

const tracteurs = computed(() => vehicules.tracteurs.filter(v => v.statut !== 'sorti'))
const optTracteurs = computed<DropdownItem[]>(() => tracteurs.value.map(v => ({ id: v.id, label: v.immatriculation, sublabel: `${v.marque} ${v.modele}` })))
const optTrajets = computed<DropdownItem[]>(() => trajets.trajets.map(t => ({ id: t.id, label: t.libelle, sublabel: t.code })))

function majCorridor(trajetId: string, v: string) {
  const n = Number(v)
  if (!v || !(n > 0)) delete p.refsCorridor[trajetId]
  else p.refsCorridor[trajetId] = n
}
function majVehiculeSeul(vehiculeId: string, v: string) {
  const n = Number(v)
  if (!v || !(n > 0)) delete p.refsVehiculeSeul[vehiculeId]
  else p.refsVehiculeSeul[vehiculeId] = n
}

const nouvelleRef = ref({ vehiculeId: '', trajetId: '', refL100: undefined as number | undefined })
const erreurRef = ref('')
function ajouterRef() {
  const n = nouvelleRef.value
  if (!n.vehiculeId || !n.trajetId || !(n.refL100 && n.refL100 > 0)) { erreurRef.value = 'Choisissez le véhicule, le corridor et une consommation supérieure à zéro.'; return }
  if (p.refsVehicule.some(r => r.vehiculeId === n.vehiculeId && r.trajetId === n.trajetId)) { erreurRef.value = 'Une référence existe déjà pour ce véhicule sur ce corridor.'; return }
  p.refsVehicule.push({ vehiculeId: n.vehiculeId, trajetId: n.trajetId, refL100: n.refL100 })
  nouvelleRef.value = { vehiculeId: '', trajetId: '', refL100: undefined }; erreurRef.value = ''
}
function supprimerRef(i: number) { p.refsVehicule.splice(i, 1) }
const plaque = (id: string) => vehicules.parId(id)?.immatriculation ?? id
const libTrajet = (id: string) => trajets.getById(id)?.libelle ?? id

/* Plage horaire : fin exclue ; un début après la fin désigne une plage de nuit. */
const erreurPlage = computed(() => {
  const ok = (h: unknown) => typeof h === 'number' && Number.isInteger(h) && h >= 0 && h <= 23
  if (!ok(p.heureDebut) || !ok(p.heureFin)) return 'Les heures de la plage horaire vont de 0 à 23.'
  if (p.heureDebut === p.heureFin) return 'Le début et la fin de la plage horaire ne peuvent pas être identiques.'
  return ''
})

/* Plafond de retenue : vide = pas d'autre plafond que le coût du carburant consommé en trop. */
const erreurPlafond = ref('')
function majPlafond(v: string) {
  if (!v.trim()) { p.plafondRetenue = undefined; erreurPlafond.value = ''; return }
  const n = Number(v)
  if (!(n > 0)) { erreurPlafond.value = 'Le plafond doit être supérieur à zéro, ou laissé vide.'; return }
  p.plafondRetenue = n; erreurPlafond.value = ''
}

/* Causes d'un écart ou d'un plein suspect. */
const nouvelleCause = ref({ libelle: '', imputable: false })
const erreurCause = ref('')
function resultatCause(r: { ok: boolean; motif?: string }) { erreurCause.value = r.ok ? '' : r.motif ?? ''; return r.ok }
function ajouterCause() {
  if (resultatCause(store.ajouterCause(nouvelleCause.value.libelle, nouvelleCause.value.imputable))) nouvelleCause.value = { libelle: '', imputable: false }
}
function renommerCause(id: string, imputable: boolean, e: Event) {
  const champ = e.target as HTMLInputElement
  if (!resultatCause(store.modifierCause(id, champ.value, imputable))) champ.value = store.libelleCause(id)
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
    <div :class="L.card">
      <div class="flex items-center gap-2 mb-3"><ShieldCheck class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Contrôles automatiques des pleins</h2></div>
      <div class="grid grid-cols-2 gap-3">
        <div :class="F.field"><label :class="F.fieldLabel">Plage horaire : début (h)</label><input v-model.number="p.heureDebut" type="number" min="0" max="23" :class="F.fieldInput" /></div>
        <div :class="F.field"><label :class="F.fieldLabel">Plage horaire : fin (h, exclue)</label><input v-model.number="p.heureFin" type="number" min="0" max="23" :class="F.fieldInput" /></div>
        <div :class="F.field"><label :class="F.fieldLabel">Écart GPS toléré (km)</label><input v-model.number="p.ecartGpsMaxKm" type="number" min="0" step="0.5" :class="F.fieldInput" /></div>
        <div></div>
        <div :class="F.field"><label :class="F.fieldLabel">Rapprochement carte : écart d'heure (min)</label><input v-model.number="p.toleranceRapprochementMin" type="number" min="0" :class="F.fieldInput" /></div>
        <div :class="F.field"><label :class="F.fieldLabel">Rapprochement carte : écart de volume (%)</label><input v-model.number="p.toleranceRapprochementPct" type="number" min="0" step="0.5" :class="F.fieldInput" /></div>
      </div>
      <p v-if="erreurPlage" class="text-[12px] text-danger mt-2">{{ erreurPlage }}</p>
    </div>

    <div :class="L.card">
      <div class="flex items-center gap-2 mb-3"><Leaf class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Écarts, retenue, émissions et écoconduite</h2></div>
      <div class="grid grid-cols-2 gap-3">
        <div :class="F.field"><label :class="F.fieldLabel">Écart de consommation à qualifier (%)</label><input v-model.number="p.seuilEcartConsoPct" type="number" min="0" step="0.5" :class="F.fieldInput" /></div>
        <div :class="F.field"><label :class="F.fieldLabel">Montant maximal par retenue ({{ $devise() }})</label><input :value="p.plafondRetenue ?? ''" type="number" min="0" :class="F.fieldInput" placeholder="aucun plafond" @change="majPlafond(($event.target as HTMLInputElement).value)" /></div>
        <div :class="F.field"><label :class="F.fieldLabel">Facteur d'émission (kg de CO2 par litre)</label><input v-model.number="p.facteurCo2KgParL" type="number" min="0" step="0.01" :class="F.fieldInput" /></div>
        <div :class="F.field"><label :class="F.fieldLabel">Ralenti prolongé au-delà de (min)</label><input v-model.number="eco.parametres.ralentiMinMinutes" type="number" min="1" :class="F.fieldInput" /></div>
        <div :class="F.field"><label :class="F.fieldLabel">Pénalité par accélération brusque</label><input v-model.number="eco.parametres.penaliteAcceleration" type="number" min="0" :class="F.fieldInput" /></div>
        <div :class="F.field"><label :class="F.fieldLabel">Pénalité par ralenti prolongé</label><input v-model.number="eco.parametres.penaliteRalenti" type="number" min="0" :class="F.fieldInput" /></div>
        <div :class="F.field" class="col-span-2"><label :class="F.fieldLabel">Énergies à faibles émissions (séparées par une virgule)</label>
          <input :value="eco.parametres.energiesFaiblesEmissions.join(', ')" :class="F.fieldInput" @change="eco.parametres.energiesFaiblesEmissions = ($event.target as HTMLInputElement).value.split(',').map(x => x.trim()).filter(Boolean)" />
        </div>
      </div>
      <p v-if="erreurPlafond" class="text-[12px] text-danger mt-2">{{ erreurPlafond }}</p>
    </div>

    <div :class="L.card">
      <div class="flex items-center gap-2 mb-3"><ListChecks class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Causes d'un écart ou d'un plein suspect</h2></div>
      <div v-for="c in p.causes" :key="c.id" class="flex items-center gap-3 py-1.5 border-b border-border/60">
        <input :value="c.libelle" :class="F.fieldInput" class="flex-1 !h-[32px]" @change="renommerCause(c.id, c.imputable, $event)" />
        <label class="flex items-center gap-1.5 text-xs text-foreground cursor-pointer whitespace-nowrap">
          <input type="checkbox" class="accent-primary" :checked="c.imputable" @change="resultatCause(store.modifierCause(c.id, c.libelle, ($event.target as HTMLInputElement).checked))" /> Imputable au chauffeur
        </label>
        <button class="w-8 h-8 flex items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:text-danger hover:bg-danger-bg cursor-pointer" title="Supprimer cette cause" @click="resultatCause(store.supprimerCause(c.id))"><Trash2 class="w-3.5 h-3.5" /></button>
      </div>
      <div class="flex items-center gap-3 mt-2">
        <input v-model="nouvelleCause.libelle" :class="F.fieldInput" class="flex-1 !h-[32px]" placeholder="Nouvelle cause" @keyup.enter="ajouterCause" />
        <label class="flex items-center gap-1.5 text-xs text-foreground cursor-pointer whitespace-nowrap"><input v-model="nouvelleCause.imputable" type="checkbox" class="accent-primary" /> Imputable au chauffeur</label>
        <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterCause">Ajouter</button>
      </div>
      <p v-if="erreurCause" class="text-[12px] text-danger mt-2">{{ erreurCause }}</p>
    </div>

    <div :class="L.card">
      <div class="flex items-center gap-2 mb-3"><Gauge class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Consommation de référence (L/100 km)</h2></div>
      <div :class="F.field" class="mb-3"><label :class="F.fieldLabel">Référence par défaut</label><input v-model.number="p.refDefautL100" type="number" min="1" step="0.5" :class="F.fieldInput" class="!w-[140px]" /></div>
      <p class="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">Par véhicule</p>
      <div v-for="v in tracteurs" :key="v.id" class="flex items-center gap-3 py-1.5 border-b border-border/60 last:border-0">
        <span class="font-mono text-xs w-[80px]">{{ v.immatriculation }}</span>
        <span class="text-xs text-muted-foreground flex-1">{{ v.marque }} {{ v.modele }}</span>
        <input :value="p.refsVehiculeSeul[v.id] ?? ''" type="number" min="0" step="0.5" :class="F.fieldInput" class="!w-[110px] !h-[32px]" placeholder="défaut" @change="majVehiculeSeul(v.id, ($event.target as HTMLInputElement).value)" />
      </div>
      <p class="text-[11px] font-semibold text-muted-foreground uppercase mt-4 mb-1.5">Par corridor</p>
      <div v-for="t in trajets.trajets" :key="t.id" class="flex items-center gap-3 py-1.5 border-b border-border/60 last:border-0">
        <span class="text-xs flex-1">{{ t.libelle }}</span>
        <input :value="p.refsCorridor[t.id] ?? ''" type="number" min="0" step="0.5" :class="F.fieldInput" class="!w-[110px] !h-[32px]" placeholder="défaut" @change="majCorridor(t.id, ($event.target as HTMLInputElement).value)" />
      </div>
      <p class="text-[11px] font-semibold text-muted-foreground uppercase mt-4 mb-1.5">Par véhicule sur un corridor</p>
      <div v-for="(r, i) in p.refsVehicule" :key="r.vehiculeId + r.trajetId" class="flex items-center gap-3 py-1.5 border-b border-border/60">
        <span class="font-mono text-xs w-[80px]">{{ plaque(r.vehiculeId) }}</span>
        <span class="text-xs flex-1 truncate">{{ libTrajet(r.trajetId) }}</span>
        <input v-model.number="r.refL100" type="number" min="1" step="0.5" :class="F.fieldInput" class="!w-[90px] !h-[32px]" />
        <button class="w-8 h-8 flex items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:text-danger hover:bg-danger-bg cursor-pointer" title="Supprimer cette référence" @click="supprimerRef(i)"><Trash2 class="w-3.5 h-3.5" /></button>
      </div>
      <div class="grid grid-cols-[1fr_1.4fr_90px_auto] gap-2 items-end mt-2">
        <SearchableDropdown v-model="nouvelleRef.vehiculeId" :items="optTracteurs" placeholder="Véhicule…" compact />
        <SearchableDropdown v-model="nouvelleRef.trajetId" :items="optTrajets" placeholder="Corridor…" compact />
        <input v-model.number="nouvelleRef.refL100" type="number" min="1" step="0.5" :class="F.fieldInput" class="!h-[32px]" placeholder="L/100" />
        <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterRef">Ajouter</button>
      </div>
      <p v-if="erreurRef" class="text-[12px] text-danger mt-2">{{ erreurRef }}</p>
    </div>

    <div :class="L.card">
      <div class="flex items-center gap-2 mb-3"><Fuel class="w-4 h-4 text-primary" /><h2 :class="L.cardTitle" class="!mb-0">Capacité des réservoirs</h2></div>
      <div v-for="v in tracteurs" :key="v.id" class="flex items-center gap-3 py-1.5 border-b border-border/60 last:border-0">
        <span class="font-mono text-xs w-[80px]">{{ v.immatriculation }}</span>
        <span class="text-xs text-muted-foreground flex-1">{{ v.marque }} {{ v.modele }}</span>
        <span class="text-xs w-[110px] text-right">{{ v.capaciteReservoirL ? `${v.capaciteReservoirL} L` : 'non renseignée' }}</span>
      </div>
      <div class="flex justify-end mt-4">
        <button :class="F.btnOutline" class="!text-[12px]" @click="store.reinitialiserParametres(); eco.reinitialiserParametres(); erreurPlafond = ''; erreurCause = ''"><Undo2 class="w-3.5 h-3.5" /> Revenir aux valeurs de départ</button>
      </div>
    </div>
  </div>
</template>
