<template>
  <div :class="L.pageWrap" class="max-w-[900px]">

    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Règles et seuils</div>
        <div :class="L.pageSub">
          Aucune valeur n'est figée dans le logiciel : tout se règle ici
        </div>
      </div>
    </div>

    <!-- Alertes -->
    <div :class="L.card" class="mb-3">
      <div :class="L.cardTitle"><Bell class="w-4 h-4 text-primary" /> Alertes documentaires</div>

      <div :class="F.fieldRow">
        <div :class="F.field">
          <label :class="F.fieldLabel">Prévenir combien de jours avant l'échéance</label>
          <input v-model.number="v.seuilAlerteJours" type="number" min="1" max="180"
                 :class="F.fieldInput" :disabled="!auth.estAdmin" />
          <span :class="F.fieldHint">Valeur par défaut : 30 jours.</span>
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Escalader après combien de jours sans réponse</label>
          <input v-model.number="v.escaladeJours" type="number" min="1" max="90"
                 :class="F.fieldInput" :disabled="!auth.estAdmin" />
          <span :class="F.fieldHint">L'alerte non traitée remonte au niveau supérieur.</span>
        </div>
      </div>

      <div class="bg-background rounded-md px-3.5 py-2.5 mt-3.5 text-[12px] text-muted-foreground leading-relaxed">
        Avec ce réglage, {{ docs.proches.length }} pièce(s) sont actuellement signalées comme
        à renouveler et {{ docs.expirees.length }} comme expirées.
      </div>
    </div>

    <!-- Temps de conduite -->
    <div :class="L.card" class="mb-3">
      <div :class="L.cardTitle"><Clock class="w-4 h-4 text-primary" /> Temps de conduite et de repos</div>

      <div class="grid grid-cols-3 gap-3 max-md:grid-cols-1">
        <div :class="F.field">
          <label :class="F.fieldLabel">Conduite maximale par jour (h)</label>
          <input v-model.number="v.conduiteMaxJournaliereH" type="number" min="1" max="24"
                 :class="F.fieldInput" :disabled="!auth.estAdmin" />
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Repos minimal par jour (h)</label>
          <input v-model.number="v.reposMinJournalierH" type="number" min="1" max="24"
                 :class="F.fieldInput" :disabled="!auth.estAdmin" />
        </div>
        <div :class="F.field">
          <label :class="F.fieldLabel">Conduite maximale par semaine (h)</label>
          <input v-model.number="v.conduiteMaxHebdoH" type="number" min="1" max="168"
                 :class="F.fieldInput" :disabled="!auth.estAdmin" />
        </div>
      </div>
    </div>

    <!-- Pièces obligatoires -->
    <div :class="L.card">
      <div :class="L.cardTitle"><FileCheck class="w-4 h-4 text-primary" /> Pièces obligatoires par profil</div>

      <div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        <div class="bg-background rounded-lg p-3.5 border border-border">
          <div class="text-[13px] font-semibold mb-2 flex items-center gap-1.5">
            <IdCard class="w-4 h-4 text-primary" /> Personnel roulant
          </div>
          <ul class="flex flex-col gap-1.5">
            <li v-for="t in PIECES_OBLIGATOIRES.roulant" :key="t" class="flex items-center gap-2 text-[13px]">
              <Check class="w-3.5 h-3.5 text-success shrink-0" /> {{ LIBELLE_TYPE_DOC[t] }}
            </li>
          </ul>
        </div>

        <div class="bg-background rounded-lg p-3.5 border border-border">
          <div class="text-[13px] font-semibold mb-2 flex items-center gap-1.5">
            <Briefcase class="w-4 h-4 text-muted-foreground" /> Personnel sédentaire
          </div>
          <ul class="flex flex-col gap-1.5">
            <li v-for="t in PIECES_OBLIGATOIRES.sedentaire" :key="t" class="flex items-center gap-2 text-[13px]">
              <Check class="w-3.5 h-3.5 text-success shrink-0" /> {{ LIBELLE_TYPE_DOC[t] }}
            </li>
          </ul>
        </div>
      </div>

      <p class="text-[11px] text-muted-foreground mt-3.5 pt-3 border-t border-border leading-relaxed">
        Une pièce obligatoire absente ou expirée empêche l'affectation à un camion.
      </p>
    </div>

    <p v-if="!auth.estAdmin" class="text-[12px] text-muted-foreground mt-3">
      Seul l'administrateur peut modifier ces valeurs. Vous les consultez en lecture seule.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bell, Briefcase, Check, Clock, FileCheck, IdCard } from '@lucide/vue'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'
import { useAuthStore } from '../../stores/auth'
import { useParametresStore } from '../../stores/parametres'
import { useDocumentsStore, PIECES_OBLIGATOIRES, LIBELLE_TYPE_DOC } from '../../stores/documentsPersonnel'

const auth = useAuthStore()
const params = useParametresStore()
const docs = useDocumentsStore()

const v = computed(() => params.valeurs)
</script>
