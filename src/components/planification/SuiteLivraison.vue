<script setup lang="ts">
/**
 * Suite d'une livraison, côté responsable des livraisons : quantité reçue et
 * écart face aux écarts autorisés (qualifié en gain ou en coulage), notes de
 * protêt, et responsabilité établie à partir des faits enregistrés, avec ses
 * impacts financiers.
 */
import { ref, computed, watch } from 'vue'
import { Paperclip } from '@lucide/vue'
import * as cls from '../../lib/formClasses'
import ChoixMotif from './ChoixMotif.vue'
import { useVoyagesStore, LIB_ORIGINE_PROBLEME, LIB_ACTEUR_RESPONSABLE, LIB_IMPACT, LIB_STATUT_PROTET, LIB_QUALIFICATION } from '../../stores/voyages'
import { useAuthStore } from '../../stores/auth'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import { fmtDateHeure } from '../../utils/voyageUtils'
import { fmtMontant } from '../../lib/monnaie'
import type { ActeurResponsable, EtapeVoyage, OrigineProbleme, PieceJointe, QualificationEcart, Voyage } from '../../types'

const props = defineProps<{ voyage: Voyage; ligne: EtapeVoyage }>()
const store = useVoyagesStore()
const auth = useAuthStore()
const params = useParametresPlanificationStore()
/* Carburant : quantités en litres, comparées à 15 °C quand le volume à 15 °C est saisi au chargement. */
const unite = computed(() => store.uniteQuantite(props.voyage, props.ligne))
/* Ordre annulé en route : la suite reste ouverte pour une livraison déjà faite. */
const habilite = computed(() => !auth.lectureSeule && params.peutPiloter(auth.role))
const peutAgir = computed(() => habilite.value && store.suiteOuverte(props.voyage, props.ligne))
/* Ordre clôturé : une note émise se clôture encore. */
const peutCloturerNote = computed(() => habilite.value && (peutAgir.value || props.voyage.statut === 'cloture'))

const message = ref<{ texte: string; erreur: boolean } | null>(null)
function resultat(r: { ok: boolean; motif?: string }, succes: string) {
  message.value = r.ok ? { texte: succes, erreur: false } : { texte: r.motif ?? 'Action impossible.', erreur: true }
  return r.ok
}
watch(() => props.ligne.id, () => { message.value = null })

/* ── Quantité reçue et écart ── */
/** Référence : quantité chargée déclarée par l'entrepôt, sinon celle de la commande. */
const reference = computed(() => store.quantiteReference(props.voyage, props.ligne))
const qteRecue = ref<number | null>(props.ligne.quantiteRecue ?? reference.value ?? null)
const justification = ref('')
function enregistrerQuantite() {
  if (qteRecue.value == null || (qteRecue.value as unknown) === '') { resultat({ ok: false, motif: 'Indiquez la quantité reçue.' }, ''); return }
  resultat(store.saisirQuantiteRecue(props.voyage.id, props.ligne.id, { recue: Number(qteRecue.value), justification: justification.value }), 'Quantité reçue enregistrée.')
}
const qualifOuverte = ref(false)
const qualif = ref<{ qualification: QualificationEcart | ''; imputable: boolean; commentaire: string }>({ qualification: '', imputable: false, commentaire: '' })
function ouvrirQualification() {
  const x = props.ligne.ecartQuantite
  qualif.value = { qualification: x?.qualification ?? (x && x.ecart > 0 ? 'gain' : ''), imputable: x?.imputableConducteur ?? false, commentaire: x?.commentaire ?? '' }
  qualifOuverte.value = true
}
function qualifier() {
  if (resultat(store.qualifierEcart(props.voyage.id, props.ligne.id, {
    qualification: qualif.value.qualification || undefined, imputableConducteur: qualif.value.imputable, commentaire: qualif.value.commentaire,
  }), 'Écart qualifié.')) qualifOuverte.value = false
}

/* ── Notes de protêt ── */
const peutReserver = computed(() => !!props.ligne.arriveeLe || !!props.ligne.livreParChauffeurLe)
const noteOuverte = ref<string | null>(null)
const note = ref<{ motif: string; quantite: number | null; pieces: PieceJointe[] }>({ motif: '', quantite: null, pieces: [] })
/** Quantité en cause préremplie avec l'écart de la livraison, s'il existe. */
function nouvelleNote() {
  const ecart = props.ligne.ecartQuantite?.ecart
  note.value = { motif: '', quantite: ecart ? Math.abs(ecart) : null, pieces: [] }
  noteOuverte.value = 'nouvelle'
}
function modifierNote(id: string) {
  const n = props.ligne.notesProtet?.find(x => x.id === id)
  if (!n) return
  note.value = { motif: n.motif, quantite: n.quantiteEnCause, pieces: [...n.piecesJointes] }
  noteOuverte.value = id
}
function joindre(e: Event) {
  const fichiers = [...((e.target as HTMLInputElement).files ?? [])]
  fichiers.forEach(f => {
    const lecteur = new FileReader()
    lecteur.onload = () => { note.value.pieces = [...note.value.pieces, { nom: f.name, dataUrl: String(lecteur.result) }] }
    lecteur.readAsDataURL(f)
  })
  ;(e.target as HTMLInputElement).value = ''
}
function enregistrerNote() {
  const d = { motif: note.value.motif, quantiteEnCause: Number(note.value.quantite), piecesJointes: note.value.pieces }
  const r = noteOuverte.value === 'nouvelle'
    ? store.preparerNoteProtet(props.voyage.id, props.ligne.id, d)
    : store.modifierNoteProtet(props.voyage.id, props.ligne.id, noteOuverte.value!, d)
  if (resultat(r, noteOuverte.value === 'nouvelle' ? 'Note de protêt préparée.' : 'Note de protêt modifiée.')) noteOuverte.value = null
}
const issue = ref<Record<string, string>>({})
function emettre(id: string) { resultat(store.emettreNoteProtet(props.voyage.id, props.ligne.id, id), 'Note de protêt émise.') }
function cloturerNote(id: string) { resultat(store.cloturerNoteProtet(props.voyage.id, props.ligne.id, id, issue.value[id] ?? ''), 'Note de protêt clôturée.') }
const clsStatut = (s: string) => s === 'cloturee' ? 'bg-neutral-bg text-neutral' : s === 'emise' ? 'bg-info-bg text-info' : 'bg-warning-bg text-warning'

/* ── Responsabilité ── */
const faits = computed(() => store.faitsLigne(props.ligne))
const respOuverte = ref(false)
type LigneRepartition = { acteur: ActeurResponsable | ''; part: number | null }
const resp = ref<{ origine: OrigineProbleme | ''; repartition: LigneRepartition[]; motif: string; commentaire: string; avoir: number | null; retenue: number | null }>({ origine: '', repartition: [{ acteur: '', part: 100 }], motif: '', commentaire: '', avoir: null, retenue: null })
const acteursPossibles = computed(() => (Object.keys(LIB_ACTEUR_RESPONSABLE) as ActeurResponsable[])
  .filter(a => props.voyage.moyen === 'externe' ? a !== 'transporteur_interne' : a !== 'transporteur_externe'))
const partExterne = computed(() => Number(resp.value.repartition.find(x => x.acteur === 'transporteur_externe')?.part) || 0)
const avoirSaisi = computed(() => resp.value.avoir != null && (resp.value.avoir as unknown) !== '' ? Number(resp.value.avoir) : 0)
const totalParts = computed(() => resp.value.repartition.reduce((t, x) => t + (Number(x.part) || 0), 0))
function ouvrirResponsabilite() {
  const r = props.ligne.responsabilite
  resp.value = { origine: r?.origine ?? '', repartition: r ? store.partsResponsabilite(r).map(x => ({ ...x })) : [{ acteur: '', part: 100 }],
    motif: r?.motif ?? '', commentaire: r?.commentaire ?? '',
    avoir: r?.impacts.find(i => i.type === 'avoir_client')?.montant ?? null, retenue: r?.impacts.find(i => i.type === 'retenue_transporteur')?.montant ?? null }
  respOuverte.value = true
}
function ajouterActeur() { resp.value.repartition.push({ acteur: '', part: Math.max(0, 100 - totalParts.value) || null }) }
function etablir() {
  const impacts: { type: 'avoir_client' | 'retenue_transporteur'; montant: number }[] = []
  if (avoirSaisi.value || (resp.value.avoir != null && (resp.value.avoir as unknown) !== '')) impacts.push({ type: 'avoir_client', montant: Number(resp.value.avoir) })
  if (partExterne.value && !avoirSaisi.value && resp.value.retenue != null && (resp.value.retenue as unknown) !== '') impacts.push({ type: 'retenue_transporteur', montant: Number(resp.value.retenue) })
  if (resultat(store.etablirResponsabilite(props.voyage.id, props.ligne.id, {
    origine: resp.value.origine || undefined, repartition: resp.value.repartition.map(x => ({ acteur: x.acteur, part: Number(x.part) })),
    motif: resp.value.motif, commentaire: resp.value.commentaire, impacts,
  }), 'Responsabilité établie.')) respOuverte.value = false
}
const lbl = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]'
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Quantité reçue -->
    <div>
      <p :class="lbl" class="mb-1">Quantité</p>
      <p class="text-[12px] text-foreground">
        Chargée : {{ reference != null ? `${reference} ${unite}` : 'non renseignée' }}
        · Reçue : {{ ligne.quantiteRecue != null ? `${ligne.quantiteRecue} ${unite}` : 'non saisie' }}
        <span v-if="ligne.quantiteConfirmeeClientLe" class="text-success"> · confirmée par le destinataire</span>
        <span v-else-if="ligne.quantiteRecue != null && ligne.livreParChauffeurLe" class="text-muted-foreground"> · en attente de la confirmation du destinataire</span>
      </p>
      <p v-if="ligne.justificationQuantite" class="text-[11px] text-muted-foreground">Justification : {{ ligne.justificationQuantite }}</p>
      <p v-if="ligne.ecartNonControle" class="text-[11px] text-warning">{{ ligne.ecartNonControle }}</p>
      <p v-for="c in (ligne.corrections ?? []).filter(x => x.action.startsWith('Quantité reçue corrigée'))" :key="c.le + c.action" class="text-[11px] text-muted-foreground" data-correction>{{ c.action }}<template v-if="c.motif"> ({{ c.motif }})</template> · {{ c.par }}, {{ fmtDateHeure(c.le) }}</p>
      <div v-if="peutAgir && ligne.livreParChauffeurLe && !ligne.receptionConfirmeeClientLe && reference != null && !ligne.bonLivraison" class="flex items-center gap-2 mt-1.5 flex-wrap">
        <input v-model.number="qteRecue" type="number" min="0" :class="cls.fieldInput" class="!h-[30px] !text-[12px] !w-[110px]" />
        <input v-model="justification" :class="cls.fieldInput" class="!h-[30px] !text-[12px] flex-1 min-w-[200px]" placeholder="Justification si l'écart est hors tolérance" />
        <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="enregistrerQuantite">{{ ligne.quantiteRecue != null ? 'Corriger la quantité reçue' : 'Enregistrer la quantité reçue' }}</button>
      </div>

      <div v-if="ligne.ecartQuantite" class="rounded-md px-3 py-2 mt-2" :class="ligne.ecartQuantite.qualification ? 'bg-background border border-border' : 'bg-warning-bg'">
        <p class="text-[12px]" :class="ligne.ecartQuantite.qualification ? 'text-foreground' : 'text-warning'">
          Écart de {{ ligne.ecartQuantite.ecart > 0 ? '+' : '' }}{{ ligne.ecartQuantite.ecart }} {{ unite }}, hors tolérance<template v-if="ligne.ecartQuantite.motif"> : {{ ligne.ecartQuantite.motif }}</template>
        </p>
        <p v-if="ligne.ecartQuantite.qualification" class="text-[12px] text-foreground mt-0.5">
          Qualifié en {{ LIB_QUALIFICATION[ligne.ecartQuantite.qualification].toLowerCase() }}, {{ ligne.ecartQuantite.imputableConducteur ? 'imputable' : 'non imputable' }} au conducteur : {{ ligne.ecartQuantite.commentaire }}
          <span class="text-muted-foreground"> · {{ ligne.ecartQuantite.qualifiePar }}, {{ fmtDateHeure(ligne.ecartQuantite.qualifieLe) }}</span>
        </p>
        <p v-else class="text-[11px] text-warning font-medium mt-0.5">À qualifier</p>
        <button v-if="peutAgir && !qualifOuverte" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0 mt-1" @click="ouvrirQualification">{{ ligne.ecartQuantite.qualification ? 'Modifier la qualification' : "Qualifier l'écart" }}</button>
        <div v-if="qualifOuverte" class="flex flex-col gap-2 mt-2">
          <div class="flex items-center gap-4 flex-wrap text-[12px]">
            <label class="flex items-center gap-1.5 cursor-pointer"><input v-model="qualif.qualification" type="radio" value="gain" class="accent-primary" /> Gain</label>
            <label class="flex items-center gap-1.5 cursor-pointer"><input v-model="qualif.qualification" type="radio" value="coulage" class="accent-primary" /> Coulage</label>
            <label class="flex items-center gap-1.5 cursor-pointer"><input v-model="qualif.imputable" type="checkbox" class="accent-primary" /> Imputable au conducteur</label>
          </div>
          <input v-model="qualif.commentaire" :class="cls.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Commentaire (obligatoire)…" />
          <div class="flex justify-end gap-2">
            <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="qualifOuverte = false">Renoncer</button>
            <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="qualifier">Qualifier</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Notes de protêt -->
    <div v-if="peutReserver || ligne.notesProtet?.length">
      <div class="flex items-center justify-between mb-1">
        <p :class="lbl">Notes de protêt</p>
        <button v-if="peutAgir && peutReserver && noteOuverte !== 'nouvelle'" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0" @click="nouvelleNote">Préparer une note de protêt</button>
      </div>
      <p v-if="!ligne.notesProtet?.length && noteOuverte !== 'nouvelle'" class="text-[12px] text-muted-foreground">Aucune note de protêt.</p>
      <div v-for="n in ligne.notesProtet ?? []" :key="n.id" class="rounded-md border border-border px-3 py-2 mb-1.5">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-mono text-[12px] font-semibold text-foreground">{{ n.numero }}</span>
          <span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="clsStatut(n.statut)">{{ LIB_STATUT_PROTET[n.statut] }}</span>
          <span class="text-[11px] text-muted-foreground ml-auto">préparée le {{ fmtDateHeure(n.prepareeLe) }} par {{ n.prepareePar }}</span>
        </div>
        <p class="text-[12px] text-foreground mt-1">{{ n.motif }} · {{ n.quantiteEnCause }} {{ unite }} en cause</p>
        <div v-if="n.piecesJointes.length" class="flex items-center gap-3 flex-wrap mt-1">
          <template v-for="pj in n.piecesJointes" :key="pj.nom">
            <a v-if="pj.dataUrl" :href="pj.dataUrl" :download="pj.nom" target="_blank" class="text-[11px] text-primary underline inline-flex items-center gap-1"><Paperclip class="w-3 h-3" /> {{ pj.nom }}</a>
            <span v-else class="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Paperclip class="w-3 h-3" /> {{ pj.nom }}</span>
          </template>
        </div>
        <p v-if="n.emiseLe" class="text-[11px] text-muted-foreground mt-1">Émise le {{ fmtDateHeure(n.emiseLe) }}</p>
        <p v-if="n.clotureeLe" class="text-[11px] text-muted-foreground">Clôturée le {{ fmtDateHeure(n.clotureeLe) }} : {{ n.issue }}</p>
        <div v-if="peutAgir && n.statut === 'en_preparation' && noteOuverte !== n.id" class="flex items-center gap-3 mt-1.5">
          <button class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0" @click="modifierNote(n.id)">Modifier</button>
          <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="emettre(n.id)">Émettre la note</button>
        </div>
        <div v-if="peutCloturerNote && n.statut === 'emise'" class="flex items-center gap-2 mt-1.5 flex-wrap">
          <input v-model="issue[n.id]" :class="cls.fieldInput" class="!h-[30px] !text-[12px] flex-1 min-w-[200px]" placeholder="Comment la réserve a été réglée (obligatoire)…" />
          <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" :disabled="!issue[n.id]?.trim()" @click="cloturerNote(n.id)">Clôturer la note</button>
        </div>
      </div>
      <div v-if="noteOuverte" class="flex flex-col gap-2 rounded-md bg-background px-3 py-2.5">
        <ChoixMotif :key="noteOuverte" type-motif="PROTET" :initial="note.motif" placeholder="Motif de la réserve (obligatoire)…" @change="m => note.motif = m" />
        <div class="flex items-center gap-2 flex-wrap">
          <label class="text-[11px] text-muted-foreground">Quantité en cause ({{ unite }})</label>
          <input v-model.number="note.quantite" type="number" min="1" :class="cls.fieldInput" class="!h-[30px] !text-[12px] !w-[110px]" />
          <label :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px] cursor-pointer"><Paperclip class="w-3.5 h-3.5" /> Joindre une pièce<input type="file" multiple class="hidden" @change="joindre" /></label>
        </div>
        <div v-if="note.pieces.length" class="flex items-center gap-2 flex-wrap">
          <span v-for="(pj, i) in note.pieces" :key="pj.nom + i" class="text-[11px] bg-card border border-border rounded px-2 py-0.5 inline-flex items-center gap-1">
            {{ pj.nom }} <button class="bg-transparent border-0 cursor-pointer text-muted-foreground p-0" title="Retirer" @click="note.pieces = note.pieces.filter((_, j) => j !== i)">×</button>
          </span>
        </div>
        <div class="flex justify-end gap-2">
          <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="noteOuverte = null">Renoncer</button>
          <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="enregistrerNote">{{ noteOuverte === 'nouvelle' ? 'Préparer la note' : 'Enregistrer' }}</button>
        </div>
      </div>
    </div>

    <!-- Responsabilité -->
    <div v-if="faits.length || ligne.responsabilite">
      <p :class="lbl" class="mb-1">Responsabilité</p>
      <ul class="list-disc pl-5 mb-1.5">
        <li v-for="f in faits" :key="f" class="text-[12px] text-muted-foreground">{{ f }}</li>
      </ul>
      <div v-if="ligne.responsabilite && !respOuverte" class="rounded-md border border-border px-3 py-2">
        <p class="text-[12px] text-foreground"><span class="font-medium">{{ store.partsResponsabilite(ligne.responsabilite).map(x => ligne.responsabilite!.repartition ? `${LIB_ACTEUR_RESPONSABLE[x.acteur]} ${x.part} %` : LIB_ACTEUR_RESPONSABLE[x.acteur]).join(', ') }}</span> · {{ LIB_ORIGINE_PROBLEME[ligne.responsabilite.origine] }}</p>
        <p class="text-[12px] text-foreground">{{ ligne.responsabilite.motif ? `${ligne.responsabilite.motif} · ` : '' }}{{ ligne.responsabilite.commentaire }}</p>
        <p v-for="i in ligne.responsabilite.impacts" :key="i.type" class="text-[12px] text-warning">{{ LIB_IMPACT[i.type] }} : {{ fmtMontant(i.montant) }}</p>
        <p v-if="ligne.responsabilite.repartition && ligne.responsabilite.impacts.some(i => i.type === 'avoir_client')" class="text-[12px] text-muted-foreground" data-impact-reparti>Part de l'avoir : {{ store.impactsRepartis(ligne.responsabilite).map(x => `${LIB_ACTEUR_RESPONSABLE[x.acteur]} ${fmtMontant(x.montant)}`).join(', ') }}</p>
        <p class="text-[11px] text-muted-foreground mt-0.5">Établie le {{ fmtDateHeure(ligne.responsabilite.etablieLe) }} par {{ ligne.responsabilite.etabliePar }}</p>
      </div>
      <button v-if="peutAgir && !respOuverte && faits.length" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0 mt-1" @click="ouvrirResponsabilite">{{ ligne.responsabilite ? 'Modifier la responsabilité' : 'Établir la responsabilité' }}</button>
      <div v-if="respOuverte" class="flex flex-col gap-2 rounded-md bg-background px-3 py-2.5 mt-1">
        <select v-model="resp.origine" :class="cls.fieldSelect" class="!h-[32px] !text-[12px]">
          <option value="">Origine du problème…</option>
          <option v-for="(l, k) in LIB_ORIGINE_PROBLEME" :key="k" :value="k">{{ l }}</option>
        </select>
        <div v-for="(x, i) in resp.repartition" :key="i" class="flex items-center gap-2 flex-wrap" data-repartition>
          <select v-model="x.acteur" :class="cls.fieldSelect" class="!h-[32px] !text-[12px] flex-1 min-w-[180px]">
            <option value="">Acteur responsable…</option>
            <option v-for="a in acteursPossibles" :key="a" :value="a">{{ LIB_ACTEUR_RESPONSABLE[a] }}</option>
          </select>
          <template v-if="resp.repartition.length > 1">
            <input v-model.number="x.part" type="number" min="1" max="100" :class="cls.fieldInput" class="!h-[30px] !text-[12px] !w-[80px]" />
            <span class="text-[12px] text-muted-foreground">%</span>
            <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="resp.repartition.splice(i, 1); if (resp.repartition.length === 1) resp.repartition[0]!.part = 100">Retirer</button>
          </template>
        </div>
        <div class="flex items-center gap-3">
          <button v-if="resp.repartition.length < acteursPossibles.length" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0" @click="ajouterActeur">Partager avec un autre acteur</button>
          <span v-if="resp.repartition.length > 1" class="text-[11px]" :class="totalParts === 100 ? 'text-muted-foreground' : 'text-warning'">Total : {{ totalParts }} %</span>
        </div>
        <ChoixMotif type-motif="RESPONSABILITE" :initial="resp.motif" placeholder="Motif (facultatif)…" @change="m => resp.motif = m" />
        <input v-model="resp.commentaire" :class="cls.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Commentaire (obligatoire)…" />
        <div class="flex items-center gap-2 flex-wrap">
          <label class="text-[11px] text-muted-foreground">Avoir au client</label>
          <input v-model.number="resp.avoir" type="number" min="0" :class="cls.fieldInput" class="!h-[30px] !text-[12px] !w-[140px]" placeholder="Facultatif" />
          <template v-if="partExterne && avoirSaisi > 0">
            <span class="text-[11px] text-muted-foreground" data-retenue-calculee>Retenue sur la facture du transporteur : {{ fmtMontant(Math.round(avoirSaisi * partExterne / 100)) }} ({{ partExterne }} % de l'avoir)</span>
          </template>
          <template v-else-if="partExterne">
            <label class="text-[11px] text-muted-foreground">Retenue sur la facture du transporteur</label>
            <input v-model.number="resp.retenue" type="number" min="0" :class="cls.fieldInput" class="!h-[30px] !text-[12px] !w-[140px]" placeholder="Facultatif" />
          </template>
        </div>
        <p v-if="ligne.facturation?.statut === 'facturee' && avoirSaisi > 0" class="text-[11px] text-muted-foreground">Livraison déjà facturée : l'avoir sera à émettre.</p>
        <div class="flex justify-end gap-2">
          <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="respOuverte = false">Renoncer</button>
          <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="etablir">Établir la responsabilité</button>
        </div>
      </div>
    </div>

    <p v-if="message" class="text-[12px]" :class="message.erreur ? 'text-danger' : 'text-success'">{{ message.texte }}</p>
  </div>
</template>
