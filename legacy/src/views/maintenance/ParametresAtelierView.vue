<template>
  <div :class="L.pageWrap">
    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Paramètres de l'atelier</div>
        <div :class="L.pageSub">Valeurs de référence, codes et contrôles de la maintenance</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">

      <!-- 1. Capacité de l'atelier -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><Building2 class="w-4 h-4 text-primary" /> Capacité de l'atelier</div>
          <BadgeOrigine groupe="capacite" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div :class="F.field"><label :class="F.fieldLabel">Garage</label><input :value="cap.site" type="text" :class="F.fieldInput" @input="saisirTexte('capacite', 'site', ($event.target as HTMLInputElement).value)" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Postes de travail</label><input :value="cap.postes" type="number" min="1" :class="F.fieldInput" placeholder="ex. 3" @input="saisir('capacite', 'postes', ($event.target as HTMLInputElement).value)" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Heures d'ouverture par jour</label><input :value="cap.heuresParJour" type="number" min="1" max="24" :class="F.fieldInput" placeholder="ex. 8" @input="saisir('capacite', 'heuresParJour', ($event.target as HTMLInputElement).value)" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Jours ouvrés par semaine</label><input :value="cap.joursOuvresParSemaine" type="number" min="1" max="7" :class="F.fieldInput" placeholder="ex. 6" @input="saisir('capacite', 'joursOuvresParSemaine', ($event.target as HTMLInputElement).value)" /></div>
        </div>
        <div v-if="store.capaciteRenseignee" class="mt-3 rounded-lg bg-background border border-border px-3.5 py-2.5">
          <div class="grid grid-cols-2 gap-3">
            <div><p class="text-lg font-bold leading-none text-foreground">{{ store.capaciteHeuresParJour }} h</p><p class="text-[11px] text-muted-foreground mt-1">Capacité par jour</p></div>
            <div><p class="text-lg font-bold leading-none text-foreground">{{ store.capaciteHeuresParSemaine }} h</p><p class="text-[11px] text-muted-foreground mt-1">Capacité par semaine</p></div>
          </div>
        </div>
      </div>

      <!-- 2. Tarif horaire de la main-d'œuvre -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><Coins class="w-4 h-4 text-primary" /> Tarif horaire de la main-d'œuvre</div>
          <BadgeOrigine groupe="mainOeuvre" />
        </div>
        <div :class="F.field"><label :class="F.fieldLabel">Tarif unique ({{ $devise() }} / heure)</label><input :value="mo.tarifUniqueAr" type="number" min="0" step="1000" :class="F.fieldInput" placeholder="ex. 12 000" @input="saisir('mainOeuvre', 'tarifUniqueAr', ($event.target as HTMLInputElement).value)" /></div>
        <button class="mt-3 text-[11px] font-medium text-primary bg-transparent border-0 cursor-pointer p-0 inline-flex items-center gap-1" @click="detailSpecialite = !detailSpecialite">
          <ChevronRight class="w-3 h-3 transition-transform" :class="detailSpecialite ? 'rotate-90' : ''" /> Le tarif varie selon la spécialité
        </button>
        <div v-if="detailSpecialite" class="grid grid-cols-2 gap-3 mt-2.5">
          <div v-for="c in COMPETENCES" :key="c" :class="F.field">
            <label :class="F.fieldLabel">{{ store.libelleCompetence(c) }}</label>
            <input :value="mo.parCompetence[c] ?? null" type="number" min="0" step="1000" :class="F.fieldInput" :placeholder="mo.tarifUniqueAr ? `défaut ${mo.tarifUniqueAr}` : $devise() + ' / h'" @input="majTarifCompetence(c, ($event.target as HTMLInputElement).value)" />
          </div>
        </div>
      </div>

      <!-- 3. Coût d'immobilisation -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><CalendarOff class="w-4 h-4 text-primary" /> Coût d'immobilisation par jour</div>
          <BadgeOrigine groupe="immobilisation" />
        </div>
        <div :class="F.field"><label :class="F.fieldLabel">Manque à gagner moyen ({{ $devise() }} / jour)</label><input :value="immo.moyenJourAr" type="number" min="0" step="10000" :class="F.fieldInput" placeholder="ex. 450 000" @input="saisir('immobilisation', 'moyenJourAr', ($event.target as HTMLInputElement).value)" /></div>
        <button class="mt-3 text-[11px] font-medium text-primary bg-transparent border-0 cursor-pointer p-0 inline-flex items-center gap-1" @click="detailTypeVehicule = !detailTypeVehicule">
          <ChevronRight class="w-3 h-3 transition-transform" :class="detailTypeVehicule ? 'rotate-90' : ''" /> Le coût diffère selon le type de véhicule
        </button>
        <div v-if="detailTypeVehicule" class="grid grid-cols-2 gap-3 mt-2.5">
          <div :class="F.field"><label :class="F.fieldLabel">Véhicule motorisé ({{ $devise() }} / jour)</label><input :value="immo.tracteurJourAr" type="number" min="0" step="10000" :class="F.fieldInput" :placeholder="immo.moyenJourAr ? `défaut ${immo.moyenJourAr}` : $devise() + ' / j'" @input="saisir('immobilisation', 'tracteurJourAr', ($event.target as HTMLInputElement).value)" /></div>
          <div :class="F.field"><label :class="F.fieldLabel">Véhicule tracté ({{ $devise() }} / jour)</label><input :value="immo.semiRemorqueJourAr" type="number" min="0" step="10000" :class="F.fieldInput" :placeholder="immo.moyenJourAr ? `défaut ${immo.moyenJourAr}` : $devise() + ' / j'" @input="saisir('immobilisation', 'semiRemorqueJourAr', ($event.target as HTMLInputElement).value)" /></div>
        </div>
        <div v-if="store.coutTotalImmobilisations != null" class="mt-3 rounded-lg bg-danger-bg px-3.5 py-2.5">
          <p class="text-lg font-bold leading-none text-danger">{{ fmtAr(store.coutTotalImmobilisations) }}</p>
          <p class="text-[11px] text-danger/80 mt-1">Coût des {{ totalJoursPerdus }} jours d'indisponibilité enregistrés</p>
        </div>
      </div>

      <!-- 4. Codification des indisponibilités -->
      <div :class="L.card" class="lg:col-span-2">
        <div class="flex items-center justify-between mb-1">
          <div :class="L.cardTitle" class="!mb-0"><Tags class="w-4 h-4 text-primary" /> Causes d'indisponibilité</div>
          <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="codif.reinitialiser(codesUtilises); erreurCode = ''">Revenir aux causes proposées</button>
        </div>
        <div class="grid grid-cols-[110px_160px_1fr_32px] gap-2 items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em] pb-1.5 border-b border-border max-sm:hidden">
          <span>Code</span><span>Famille</span><span>Libellé</span><span></span>
        </div>
        <div v-for="c in codif.codes" :key="c.code" class="grid grid-cols-[110px_160px_1fr_32px] gap-2 items-center py-1.5 border-b border-border/60 max-sm:grid-cols-1">
          <span class="text-xs font-mono text-foreground">{{ c.code }}</span>
          <select :value="c.famille" :class="F.fieldInput" class="!h-[32px] !text-[12px]" @change="codif.modifier(c.code, { famille: ($event.target as HTMLSelectElement).value as FamilleIndispo })">
            <option v-for="(lib, f) in LIB_FAMILLE_INDISPO" :key="f" :value="f">{{ lib }}</option>
          </select>
          <input :value="c.libelle" :class="F.fieldInput" class="!h-[32px] !text-[12px]" @change="renommerCode(c.code, $event.target as HTMLInputElement)" />
          <button class="w-8 h-8 flex items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:text-danger hover:bg-danger-bg cursor-pointer" title="Supprimer cette cause" @click="supprimerCode(c.code)"><Trash2 class="w-3.5 h-3.5" /></button>
        </div>
        <div class="grid grid-cols-[110px_160px_1fr_auto] gap-2 items-center mt-3 max-sm:grid-cols-1">
          <input v-model="nouveauCode.code" :class="F.fieldInput" class="!h-[32px] !text-[12px] uppercase" placeholder="Code" maxlength="6" />
          <select v-model="nouveauCode.famille" :class="F.fieldInput" class="!h-[32px] !text-[12px]">
            <option v-for="(lib, f) in LIB_FAMILLE_INDISPO" :key="f" :value="f">{{ lib }}</option>
          </select>
          <input v-model="nouveauCode.libelle" :class="F.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Libellé de la cause" />
          <button :class="F.btnPrimary" class="!py-1.5 !text-[12px]" @click="ajouterCode">Ajouter</button>
        </div>
        <p v-if="erreurCode" class="text-[11px] text-danger mt-1.5">{{ erreurCode }}</p>
        <p class="text-[11px] font-semibold text-muted-foreground uppercase mt-4 mb-1.5">Causes posées automatiquement</p>
        <div class="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
          <div v-for="(lib, k) in LIB_CODES_AUTO" :key="k" :class="F.field">
            <label :class="F.fieldLabel">{{ lib }}</label>
            <select v-model="codif.codesAuto[k]" :class="F.fieldSelect" class="!h-[32px] !text-[12px]">
              <option v-for="c in codif.codes" :key="c.code" :value="c.code">{{ c.code }} · {{ c.libelle }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Compétences et techniciens de l'atelier interne -->
      <ReglageTechniciens class="lg:col-span-2" />

      <!-- Nomenclature de diagnostic des pannes -->
      <ReglageNomenclature class="lg:col-span-2" />

      <!-- 5. Points de contrôle du véhicule -->
      <ReglagePointsControle class="lg:col-span-2" />

      <!-- 6. Seuils des pneumatiques -->
      <ReglageSeuilsPneus />

      <!-- 7. Objectifs de l'équipe mobile -->
      <ReglageObjectifsMobile v-if="params.estActif('maintenance_equipe_mobile')" />

      <!-- 8. Plans de positions des pneus -->
      <ReglagePlansPneus class="lg:col-span-2" />

      <!-- 9. Préavis d'entretien préventif : une échéance devient « proche » au premier seuil atteint -->
      <div :class="L.card">
        <div :class="L.cardTitle"><CalendarClock class="w-4 h-4 text-primary" /> Préavis d'entretien préventif</div>
        <div class="grid grid-cols-3 gap-3">
          <div :class="F.field">
            <label :class="F.fieldLabel">Kilomètres avant</label>
            <input v-model.number="config.parametres.preavisEntretienKm" type="number" min="0" :class="[F.fieldInput, config.seuilHorsBornes('preavisEntretienKm') ? 'border-danger' : '']" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Jours avant</label>
            <input v-model.number="config.parametres.preavisEntretienJours" type="number" min="0" :class="[F.fieldInput, config.seuilHorsBornes('preavisEntretienJours') ? 'border-danger' : '']" />
          </div>
          <div :class="F.field">
            <label :class="F.fieldLabel">Heures moteur avant</label>
            <input :value="store.preavisHeures" type="number" min="1" :class="[F.fieldInput, erreurPreavis ? 'border-danger' : '']" @change="majPreavis($event.target as HTMLInputElement)" />
          </div>
        </div>
        <p v-if="config.seuilHorsBornes('preavisEntretienKm')" class="text-[11px] text-danger mt-1.5">
          Kilomètres attendus entre {{ config.BORNES_SEUILS.preavisEntretienKm.min }} et {{ config.BORNES_SEUILS.preavisEntretienKm.max.toLocaleString('fr-FR') }} km.
        </p>
        <p v-if="config.seuilHorsBornes('preavisEntretienJours')" class="text-[11px] text-danger mt-1.5">
          Jours attendus entre {{ config.BORNES_SEUILS.preavisEntretienJours.min }} et {{ config.BORNES_SEUILS.preavisEntretienJours.max }} jours.
        </p>
        <p v-if="erreurPreavis" class="text-[11px] text-danger mt-1.5">{{ erreurPreavis }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Paramètres de l'atelier : capacité, tarif horaire, coût d'immobilisation,
 * causes d'indisponibilité, compétences, nomenclature, points de contrôle,
 * seuils et plans de positions des pneus, objectifs de l'équipe mobile.
 * Un champ vide masque l'indicateur qu'il gouverne.
 */
import { devise } from '../../lib/monnaie'
import { ref, computed } from 'vue'
import { Building2, Coins, CalendarClock, CalendarOff, ChevronRight, Tags, Trash2 } from '@lucide/vue'
import ReglagePlansPneus from '../../components/maintenance/ReglagePlansPneus.vue'
import ReglagePointsControle from '../../components/maintenance/ReglagePointsControle.vue'
import ReglageTechniciens from '../../components/maintenance/ReglageTechniciens.vue'
import ReglageNomenclature from '../../components/maintenance/ReglageNomenclature.vue'
import ReglageSeuilsPneus from '../../components/maintenance/ReglageSeuilsPneus.vue'
import ReglageObjectifsMobile from '../../components/maintenance/ReglageObjectifsMobile.vue'
import { useCodificationIndispoStore } from '../../stores/codificationIndispo'
import { useReglesDocumentsStore } from '../../stores/reglesDocuments'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useConfigurationStore } from '../../stores/configuration'
import { useParametresModulesStore } from '../../stores/parametresModules'
import BadgeOrigine from '../../components/maintenance/BadgeOrigine.vue'
import { LIB_FAMILLE_INDISPO } from '../../types/maintenance'
import type { CompetenceAtelier, FamilleIndispo } from '../../types/maintenance'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = useMaintenanceStore()
const codif = useCodificationIndispoStore()
const config = useConfigurationStore()
const reglesDocs = useReglesDocumentsStore()
const codesUtilises = computed(() => [...new Set(store.indisponibilites.map(i => i.code))])
const LIB_CODES_AUTO = { preventif: 'Ordre de travail préventif', correctif: 'Ordre de travail correctif', accident: 'Réparation après accident ou incident', horsService: 'Véhicule hors service', entretienDepasse: 'Entretien préventif dépassé', inspectionNonConforme: 'Inspection périodique non conforme' } as const
function supprimerCode(code: string) {
  const r = codif.supprimer(code, { utilisations: store.indisponibilites.filter(i => i.code === code).length, protege: reglesDocs.parametres.codeIndispoReglementaire === code })
  erreurCode.value = r.ok ? '' : r.motif ?? ''
}
function renommerCode(code: string, champ: HTMLInputElement) {
  const r = codif.modifier(code, { libelle: champ.value })
  erreurCode.value = r.ok ? '' : r.motif ?? ''
  if (!r.ok) champ.value = codif.libelleDuCode(code)
}
const erreurPreavis = ref('')
function majPreavis(champ: HTMLInputElement) {
  const r = store.majPreavisHeures(Number(champ.value))
  erreurPreavis.value = r.ok ? '' : r.motif ?? ''
  if (!r.ok) champ.value = String(store.preavisHeures)
}
const nouveauCode = ref({ code: '', famille: 'technique' as FamilleIndispo, libelle: '' })
const erreurCode = ref('')
function ajouterCode() {
  const res = codif.ajouter(nouveauCode.value)
  erreurCode.value = res.ok ? '' : (res.motif ?? '')
  if (res.ok) nouveauCode.value = { code: '', famille: nouveauCode.value.famille, libelle: '' }
}
const params = useParametresModulesStore()

function fmtAr(n: number) { return n.toLocaleString('fr-FR') + ' ' + devise() }

const COMPETENCES = computed<CompetenceAtelier[]>(() => store.competences.map(c => c.code))
const detailSpecialite = ref(false)
const detailTypeVehicule = ref(false)

const cap = store.parametresAtelier.capacite
const mo = store.parametresAtelier.mainOeuvre
const immo = store.parametresAtelier.immobilisation

type Groupe = 'capacite' | 'mainOeuvre' | 'immobilisation'

/** Le marquage se fait à la saisie, pas à la validation : une valeur
 *  touchée cesse d'être une simulation même si l'exploitant a retapé le
 *  même chiffre. */
function saisir(groupe: Groupe, champ: string, valeur: string) {
  const n = Number(valeur)
  const cible = store.parametresAtelier[groupe] as unknown as Record<string, unknown>
  cible[champ] = !valeur.trim() || Number.isNaN(n) || n <= 0 ? null : n
  store.marquerSaisiParClient(groupe)
}
function saisirTexte(groupe: Groupe, champ: string, valeur: string) {
  const cible = store.parametresAtelier[groupe] as unknown as Record<string, unknown>
  cible[champ] = valeur
  store.marquerSaisiParClient(groupe)
}
function majTarifCompetence(c: CompetenceAtelier, valeur: string) {
  const n = Number(valeur)
  if (!valeur.trim() || Number.isNaN(n) || n <= 0) delete mo.parCompetence[c]
  else mo.parCompetence[c] = n
  store.marquerSaisiParClient('mainOeuvre')
}

const totalJoursPerdus = computed(() => Object.values(store.joursPerdusParFamille).reduce((s, v) => s + v, 0))
</script>
