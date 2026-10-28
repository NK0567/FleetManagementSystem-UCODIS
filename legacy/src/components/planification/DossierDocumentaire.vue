<script setup lang="ts">
/**
 * Dossier documentaire d'une expédition, constitué automatiquement : tout ce
 * que l'expédition a produit (ordre de transport, liste de chargement, bons
 * de livraison, incidents, fiche de débriefing, notes de protêt, enquêtes,
 * pièces saisies), chacun ouvrable.
 */
import { ref, computed } from 'vue'
import { FileText, Paperclip, Printer, X } from '@lucide/vue'
import { useVoyagesStore, LIB_DOC, LIB_STATUT_PROTET, LIB_QUALIFICATION } from '../../stores/voyages'
import { useCommandesStore } from '../../stores/commandes'
import { useEcartsStore, LIB_TYPE_ECART, LIB_NATURE } from '../../stores/ecarts'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import { fmtDateHeure, STATUTS_VOYAGE, libelleFinLigne, horsTournee } from '../../utils/voyageUtils'
import { useControlesTransportStore } from '../../stores/controlesTransport'
import { fmtL, libelleMesure } from '../../lib/volume15'
import type { PieceJointe, Voyage } from '../../types'

const props = defineProps<{ voyage: Voyage; impression?: boolean }>()
const store = useVoyagesStore()
const commandes = useCommandesStore()
const ecarts = useEcartsStore()
const params = useParametresPlanificationStore()
const ctrl = useControlesTransportStore()

interface Piece { id: string; famille: string; titre: string; date?: string; etat?: string; lignes?: [string, string][]; pieces?: PieceJointe[]; lien?: string }

const pieces = computed<Piece[]>(() => {
  const v = props.voyage
  const unite = params.parametres.uniteComptage
  const moyens = store.moyensDe(v)
  const out: Piece[] = []
  const lignes = [...v.etapes].sort((a, b) => a.ordre - b.ordre)
  const nom = (e: { destinataire?: string; siteNom: string }) => e.destinataire ?? e.siteNom
  out.push({ id: 'ot', famille: 'Ordre de transport', titre: v.numeroOT || v.reference, date: v.createdAt, etat: STATUTS_VOYAGE[v.statut].label, lignes: [
    ['Date prévue', fmtDateHeure(v.datePlanifiee)], ['Véhicule', moyens.vehicule], ['Conducteur', moyens.conducteur],
    ...(v.modeTransport ? [['Mode de transport', v.modeTransport] as [string, string]] : []),
    ['Trajet de référence', v.trajetLibelle ?? 'Composé pour ce voyage'],
    ['Livraisons', lignes.filter(e => e.role === 'livraison').map(nom).join(', ') || '-'],
    ['Poids chargé', `${v.marchandise.poidsChargeKg.toLocaleString('fr-FR')} kg`],
  ] })
  store.documentsDuVoyage(v.id).filter(d => d.present).forEach(d => out.push({
    id: d.id, famille: LIB_DOC[d.type], titre: d.numero ?? LIB_DOC[d.type], date: d.date, lignes: [['Émetteur', d.emetteur ?? '-'], ['Date', d.date ?? '-']],
  }))
  /* Carburant : bon d'enlèvement et BSL. */
  const be = v.carburant?.bonEnlevement
  if (be) {
    out.push({ id: 'be', famille: "Bon d'enlèvement", titre: be.numero, date: be.emisLe, etat: be.statut === 'confirme' ? 'Confirmé' : v.statut === 'annule' ? 'Annulé' : 'Émis', lien: `/chargement/${v.id}?document=enlevement`, lignes: [
      ['Dépôt de chargement', v.carburant!.depotNom], ['Camion', `${v.vehiculePlaque ?? '-'} · ${v.semiRemorquePlaque ?? '-'}`], ['Conducteur', v.chauffeurNom ?? '-'],
      ['Compartiments', v.carburant!.plan.filter(x => (x.volumeL ?? 0) > 0).map(x => `${x.numero} : ${x.produit}, ${fmtL(x.volumeL)}${x.nonCharge ? ' (non chargé)' : ''}`).join(' · ')],
      ['Transmis au dépôt', be.transmisLe ? `${fmtDateHeure(be.transmisLe)}, ${be.transmisA}` : 'Pas encore'],
    ] })
    if (be.bsl) out.push({ id: 'bsl', famille: 'BSL', titre: be.bsl.numero, date: be.bsl.saisiLe, lignes: [
      ['Saisi par', `${be.bsl.saisiPar}${be.bsl.parDepot ? ' (dépôt)' : ''}`],
      ...be.bsl.mesures.map(m => [`Compartiment ${m.numero}`, libelleMesure(m)] as [string, string]),
    ] })
  }
  if (v.chargementEntrepotLe) {
    /* Ordre de chargement : l'inverse de l'ordre de livraison. */
    const charges = lignes.filter(e => e.role === 'livraison' && !horsTournee(e) && !e.annuleeAvantDepart)
    out.push({ id: 'lc', famille: 'Liste de chargement', titre: `Liste de chargement ${v.numeroOT || v.reference}`, date: v.chargementEntrepotLe, lien: `/chargement/${v.id}`,
      lignes: [...charges].reverse().map((e, i) => [`Chargé en ${i + 1}`, `${nom(e)}, livraison n° ${charges.length - i}`] as [string, string]) })
  }
  lignes.filter(e => e.eBL).forEach(e => out.push({
    id: `bl-${e.id}`, famille: 'Bon de livraison', titre: e.eBL!.reference, date: e.eBL!.emisLe, etat: e.eBL!.signePar ? 'Signé' : 'En attente du client', lignes: [
      ['Destinataire', e.eBL!.destinataire], ['Adresse', e.eBL!.adresse], ['Marchandise', e.eBL!.produit],
      ...(e.eBL!.quantiteRecue != null ? [[e.bonLivraison ? (store.uniteQuantite(v, e) === 'L' ? 'Volume livré' : 'Volume livré à 15 °C') : 'Quantité reçue', e.bonLivraison ? fmtL(e.eBL!.quantiteRecue) : `${e.eBL!.quantiteRecue} ${unite}`] as [string, string]] : []),
      ...(e.eBL!.volumes ?? []).map(m => [`Compartiment ${m.numero}`, libelleMesure(m, ' dépotés')] as [string, string]),
      ...(e.eBL!.articlesNonLivres?.length ? [['Articles non livrés', e.eBL!.articlesNonLivres.map(a => `${a.libelle} (${a.motif})`).join(', ')] as [string, string]] : []),
      ['Signature', e.eBL!.signePar ? `Réception confirmée par ${e.eBL!.signePar}` : 'En attente de la confirmation du client'],
    ] }))
  /* Incidents : tout ce qui a dévié du déroulement prévu, livraison par livraison. */
  lignes.forEach(e => {
    const inc = (id: string, titre: string, date: string | undefined, detail: string) => out.push({ id: `${id}-${e.id}`, famille: 'Incident', titre: `${titre} · ${nom(e)}`, date, lignes: [['Livraison', nom(e)], ['Détail', detail]] })
    if (e.chargementNonConformeLe) inc('nc', 'Non-conformité au chargement', e.chargementNonConformeLe, e.motifNonConformite ?? '')
    if (e.reporteLe) inc('rp', 'Point reporté', e.reporteLe, e.motifReport ?? '')
    if (e.retourEntrepotLe) inc('rt', 'Report demandé sur place', e.retourEntrepotLe, e.motifRetour ?? '')
    if (e.ligneAnnuleeLe) inc('rf', e.bonLivraison ? `${libelleFinLigne(e)}, bon ${e.bonLivraison.numero}` : libelleFinLigne(e)!, e.ligneAnnuleeLe,
      `${e.motifAnnulationLigne ?? ''}${e.incidentBon ? ` · ${ctrl.libelleMotif('typesIncident', e.incidentBon.typeIncident)}, ${ctrl.libelleMotif('typesMotif', e.incidentBon.typeMotif)}, ${ctrl.libelleMotif('codesMotif', e.incidentBon.codeMotif)}` : ''}`)
    if (e.receptionContesteeLe) inc('ct', 'Contestée', e.receptionContesteeLe, `${e.motifContestation ?? ''}${e.noteTraitementContestation ? ` · Traitée : ${e.noteTraitementContestation}` : ''}`)
    if (e.retourNonConformeLe) inc('rn', 'Retour non conforme', e.retourNonConformeLe, e.motifRetourNonConforme ?? '')
    if (e.ecartQuantite) inc('eq', 'Écart de quantité', e.ecartQuantite.detecteLe,
      `${e.ecartQuantite.ecart > 0 ? '+' : ''}${e.ecartQuantite.ecart} ${e.bonLivraison ? 'L à 15 °C' : unite}${e.ecartQuantite.qualification ? `, ${LIB_QUALIFICATION[e.ecartQuantite.qualification].toLowerCase()}, ${e.ecartQuantite.imputableConducteur ? 'imputable' : 'non imputable'} au conducteur` : ', à qualifier'}`)
  })
  ecarts.ecartsDuVoyage(v.id).forEach(x => out.push({ id: `ec-${x.id}`, famille: 'Incident', titre: LIB_TYPE_ECART[x.type], date: x.detecteLe, etat: LIB_NATURE[x.nature].label,
    lignes: [['Lieu', x.lieu ?? '-'], ['Détecté le', fmtDateHeure(x.detecteLe)], ['Qualification', LIB_NATURE[x.nature].label]] }))
  if (v.debriefing) out.push({ id: 'db', famille: 'Fiche de débriefing', titre: `Débriefing ${v.debriefing.numeroBon}`, date: v.debriefing.enregistreeLe, lignes: [
    ['Numéro de bon', v.debriefing.numeroBon], ['Date de chargement', fmtDateHeure(v.debriefing.dateChargement)], ['Date de déchargement', fmtDateHeure(v.debriefing.dateDechargement)],
    ['Lieu', v.debriefing.lieu || '-'], ['Véhicule', v.debriefing.vehicule || '-'], ['Citerne', v.debriefing.citerne || '-'],
    ['Gain ou coulage qualifié', v.debriefing.gainOuCoulage || '-'], ['Observations', v.debriefing.observations || '-'],
  ] })
  lignes.forEach(e => (e.notesProtet ?? []).forEach(n => out.push({ id: `np-${n.id}`, famille: 'Note de protêt', titre: n.numero, date: n.prepareeLe, etat: LIB_STATUT_PROTET[n.statut], pieces: n.piecesJointes, lignes: [
    ['Livraison', nom(e)], ['Motif', n.motif], ['Quantité en cause', `${n.quantiteEnCause} ${unite}`],
    ...(n.emiseLe ? [['Émise le', fmtDateHeure(n.emiseLe)] as [string, string]] : []), ...(n.issue ? [['Clôture', n.issue] as [string, string]] : []),
  ] })))
  lignes.filter(e => e.satisfactionNote != null).forEach(e => out.push({ id: `sd-${e.id}`, famille: 'Enquête du destinataire', titre: nom(e), lignes: [
    ['Note', `${e.satisfactionNote}/5`], ['Commentaire', e.satisfactionCommentaire ?? '-'] ] }))
  commandes.enquetesOrdonnateurDuVoyage(v.id).forEach(({ commande: c, enquete: q }) => out.push({ id: `so-${c.id}`, famille: "Enquête de l'ordonnateur", titre: q.reponduPar, date: q.reponduLe, lignes: [
    ['Demande', `${c.destinataire}${c.referenceExterne ? ` (${c.referenceExterne})` : ''}`], ['Respect de la demande', `${q.respectOrdre}/5`], ['Délais', `${q.delais}/5`], ['Qualité', `${q.qualite}/5`], ['Commentaire', q.commentaire ?? '-'],
  ] }))
  return out
})

const ouverte = ref<Piece | null>(null)
</script>

<template>
  <!-- Dossier imprimable : toutes les pièces, en entier -->
  <div v-if="impression" class="flex flex-col gap-4" data-dossier-imprimable>
    <div v-for="p in pieces" :key="p.id" class="border border-gray-400 rounded p-3 break-inside-avoid">
      <div class="flex items-baseline justify-between gap-3 border-b border-gray-300 pb-1.5 mb-2">
        <p class="text-sm"><span class="font-semibold">{{ p.famille }}</span> · {{ p.titre }}</p>
        <p class="text-xs shrink-0">{{ p.etat ?? '' }}<template v-if="p.etat && p.date"> · </template>{{ p.date ? fmtDateHeure(p.date) : '' }}</p>
      </div>
      <div v-for="[l, val] in p.lignes ?? []" :key="l" class="grid grid-cols-[170px_1fr] gap-2 text-xs py-0.5">
        <span class="font-semibold">{{ l }}</span><span>{{ val }}</span>
      </div>
      <p v-if="p.pieces?.length" class="text-xs mt-1">Pièces jointes : {{ p.pieces.map(pj => pj.nom).join(', ') }}</p>
    </div>
  </div>
  <div v-else>
    <div class="flex justify-end mb-1">
      <RouterLink :to="`/chargement/${voyage.id}?document=dossier`" target="_blank" class="text-[11px] text-primary underline inline-flex items-center gap-1" data-imprimer-dossier><Printer class="w-3 h-3" /> Imprimer le dossier</RouterLink>
    </div>
    <div class="flex flex-col">
      <div v-for="p in pieces" :key="p.id" class="flex items-center gap-2.5 py-2 border-b border-border last:border-0">
        <FileText class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span class="text-[11px] text-muted-foreground w-[170px] shrink-0 max-sm:w-[110px]">{{ p.famille }}</span>
        <span class="text-[12px] text-foreground flex-1 min-w-0 truncate">{{ p.titre }}</span>
        <span v-if="p.etat" class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-background text-muted-foreground shrink-0">{{ p.etat }}</span>
        <span v-if="p.date" class="text-[11px] text-muted-foreground shrink-0 max-sm:hidden">{{ fmtDateHeure(p.date) }}</span>
        <RouterLink v-if="p.lien" :to="p.lien" target="_blank" class="text-[11px] text-primary underline shrink-0 inline-flex items-center gap-1"><Printer class="w-3 h-3" /> Ouvrir</RouterLink>
        <button v-else class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0 shrink-0" @click="ouverte = p">Ouvrir</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="ouverte" class="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 px-4" @click.self="ouverte = null">
        <div class="bg-card rounded-xl shadow-xl w-full max-w-md overflow-hidden">
          <div class="bg-primary px-5 py-3.5 flex items-center justify-between">
            <h3 class="text-white font-semibold text-sm">{{ ouverte.famille }}</h3>
            <button class="text-white/80 hover:text-white bg-transparent border-0 cursor-pointer" title="Fermer" @click="ouverte = null"><X class="w-5 h-5" /></button>
          </div>
          <div class="p-5 flex flex-col gap-2.5">
            <div class="text-center pb-2.5 border-b border-border">
              <p class="font-mono text-sm font-semibold text-foreground">{{ ouverte.titre }}</p>
              <p class="text-[11px] text-muted-foreground">Ordre {{ voyage.numeroOT || voyage.reference }}<template v-if="ouverte.date"> · {{ fmtDateHeure(ouverte.date) }}</template></p>
            </div>
            <div v-for="[l, val] in ouverte.lignes ?? []" :key="l" class="grid grid-cols-[140px_1fr] gap-2 text-[12px]">
              <span class="text-muted-foreground">{{ l }}</span><span class="text-foreground">{{ val }}</span>
            </div>
            <div v-if="ouverte.pieces?.length" class="flex flex-wrap gap-3 pt-1">
              <template v-for="pj in ouverte.pieces" :key="pj.nom">
                <a v-if="pj.dataUrl" :href="pj.dataUrl" :download="pj.nom" target="_blank" class="text-[11px] text-primary underline inline-flex items-center gap-1"><Paperclip class="w-3 h-3" /> {{ pj.nom }}</a>
                <span v-else class="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Paperclip class="w-3 h-3" /> {{ pj.nom }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
