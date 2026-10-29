<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { EMPTY_CELL, formatDateTime } from '@/utils/format'
import type { DossierPieceState } from '../domain/closing'
import type { DocumentaryDossierApi, DossierPieceApi } from '../types/dossier.types'

/** The documentary dossier, put together from the order on its own (TRS05-US04). */
defineProps<{ dossier: DocumentaryDossierApi }>()
const { t, te } = useI18n()

const TONES: Record<DossierPieceState, StatusTone> = {
  available: 'success',
  pending: 'warning',
  missing: 'neutral'
}

const pieceLabel = (piece: DossierPieceApi) =>
  piece.kind === 'depot_document' && piece.fuel
    ? t('planning.dossier.piece.bsl')
    : t(`planning.dossier.piece.${piece.kind}`)
const kindLabel = (kind: string) =>
  te(`planning.transportOrders.closing.kinds.${kind}`)
    ? t(`planning.transportOrders.closing.kinds.${kind}`)
    : kind
</script>

<template>
  <div class="space-y-3 text-sm">
    <div class="flex items-center justify-between gap-2">
      <p class="font-semibold text-card-foreground">{{ t('planning.dossier.documentary') }}</p>
      <StatusPill
        :label="
          dossier.complete ? t('planning.dossier.complete') : t('planning.dossier.incomplete')
        "
        :tone="dossier.complete ? 'success' : 'warning'"
      />
    </div>
    <table class="w-full text-xs border border-border">
      <thead class="bg-muted/50 text-muted-foreground">
        <tr>
          <th class="px-2 py-1.5 text-left font-medium">{{ t('planning.dossier.col.piece') }}</th>
          <th class="px-2 py-1.5 text-left font-medium">
            {{ t('planning.dossier.col.reference') }}
          </th>
          <th class="px-2 py-1.5 text-left font-medium">{{ t('planning.dossier.col.date') }}</th>
          <th class="px-2 py-1.5 text-left font-medium">{{ t('planning.dossier.col.state') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(piece, index) in dossier.pieces"
          :key="`${piece.kind}-${index}`"
          class="border-t border-border align-top"
        >
          <td class="px-2 py-1.5 text-card-foreground">
            {{ pieceLabel(piece) }}
            <p v-if="piece.label" class="text-muted-foreground">{{ piece.label }}</p>
          </td>
          <td class="px-2 py-1.5">
            <template v-if="piece.kind === 'incidents'">
              {{ t('planning.dossier.incidentCount', Number(piece.reference)) }}
            </template>
            <template v-else>{{ piece.reference || EMPTY_CELL }}</template>
            <div v-if="piece.file" class="mt-1 print-hide">
              <FileAttachmentField :file="piece.file" disabled />
            </div>
          </td>
          <td class="px-2 py-1.5 whitespace-nowrap">{{ formatDateTime(piece.at) }}</td>
          <td class="px-2 py-1.5">
            <StatusPill
              :label="t(`planning.dossier.state.${piece.state}`)"
              :tone="TONES[piece.state]"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <div>
      <p class="font-semibold text-card-foreground mb-1">{{ t('planning.dossier.incidents') }}</p>
      <p v-if="!dossier.incidents.length" class="text-xs text-muted-foreground">
        {{ t('planning.dossier.noIncident') }}
      </p>
      <ul v-else class="space-y-1 text-xs">
        <li
          v-for="(incident, index) in dossier.incidents"
          :key="index"
          class="flex flex-wrap gap-x-2 text-card-foreground"
        >
          <span class="font-medium">{{ t(`planning.dossier.incident.${incident.kind}`) }}</span>
          <span v-if="incident.lineNo" class="text-muted-foreground">
            {{ t('planning.dossier.lineNo', { no: incident.lineNo }) }}
          </span>
          <span class="text-muted-foreground">{{ formatDateTime(incident.at) }}</span>
          <span v-if="incident.detail">{{ incident.detail }}</span>
        </li>
      </ul>
    </div>

    <div v-if="dossier.documents.length">
      <p class="font-semibold text-card-foreground mb-1">{{ t('planning.dossier.otherFiles') }}</p>
      <div class="space-y-1">
        <BaseFormField
          v-for="document in dossier.documents"
          :key="document.kind"
          :label="kindLabel(document.kind)"
        >
          <FileAttachmentField :file="document.file" disabled />
        </BaseFormField>
      </div>
    </div>
  </div>
</template>
