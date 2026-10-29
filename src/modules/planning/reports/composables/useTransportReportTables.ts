import { computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReportTable } from '@/modules/fleet/reports/composables/useReportFormat'
import { useOptionsStore } from '@/stores/optionsStore'
import { EMPTY_CELL, formatDateTime, formatNumber } from '@/utils/format'
import type { RateGroup, TransportReportApi } from '../types/planningReport.types'
import { OUTCOME_KEYS } from '../types/planningReport.types'
import { cellOf } from './useReportExport'

const num = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined
    ? cellOf(EMPTY_CELL, null)
    : cellOf(formatNumber(value, digits), value)
const pct = (value: number | null | undefined) =>
  value === null || value === undefined ? cellOf(EMPTY_CELL, null) : cellOf(`${value} %`, value)
const text = (value: string | null | undefined) =>
  value ? cellOf(value) : cellOf(EMPTY_CELL, null)

/** The tables of the transport reports, shown on screen and exported as they are. */
export function useTransportReportTables(report: Ref<TransportReportApi | null>) {
  const { t } = useI18n()
  const optionsStore = useOptionsStore()
  const col = (key: string) => t(`planning.reports.col.${key}`)
  const meansLabel = (means: string | null) =>
    means ? optionsStore.getOptionLabel('transportMeans', means) : EMPTY_CELL

  function rateTable(title: string, first: string, groups: RateGroup[]): ReportTable {
    return {
      title,
      headers: [first, col('onTime'), col('deliveries'), col('rate')],
      numeric: [false, true, true, true],
      rows: groups.map((group) => [
        text(group.label || t('planning.reports.fleet')),
        num(group.onTime),
        num(group.total),
        pct(group.rate)
      ])
    }
  }

  const punctuality = computed<ReportTable[]>(() => {
    const data = report.value?.punctuality
    if (!data) return []
    return [
      rateTable(t('planning.reports.punctuality.byPeriod'), col('period'), data.byPeriod),
      rateTable(t('planning.reports.punctuality.byRecipient'), col('recipient'), data.byRecipient),
      rateTable(t('planning.reports.punctuality.byCarrier'), col('carrier'), data.byCarrier),
      {
        title: t('planning.reports.punctuality.deliveries'),
        headers: [
          col('order'),
          col('recipient'),
          col('deliveryPoint'),
          col('carrier'),
          col('plannedAt'),
          col('actualAt'),
          col('delayMin'),
          col('onTime')
        ],
        numeric: [false, false, false, false, false, false, true, false],
        rows: data.deliveries.map((row) => [
          text(row.orderNo),
          text(row.recipientName),
          text(row.deliveryPointName),
          text(row.carrierName || t('planning.reports.fleet')),
          text(formatDateTime(row.plannedAt)),
          text(formatDateTime(row.actualAt)),
          num(row.delayMin),
          text(row.onTime ? t('common.yes') : t('common.no'))
        ])
      }
    ]
  })

  const costs = computed<ReportTable[]>(() => {
    const data = report.value?.costs
    if (!data) return []
    return [
      {
        title: t('planning.reports.costs.title'),
        headers: [
          col('order'),
          col('means'),
          col('vehicle'),
          col('distanceKm'),
          col('vehicleCost'),
          col('fuelCost'),
          col('carrierInvoice'),
          col('total')
        ],
        numeric: [false, false, false, true, true, true, true, true],
        rows: [
          ...data.orders.map((row) => [
            text(row.orderNo),
            text(meansLabel(row.means)),
            text(
              row.means === 'carrier' ? `${row.carrierName} ${row.vehiclePlate}` : row.vehiclePlate
            ),
            num(row.distanceKm),
            num(row.vehicleCost),
            num(row.fuelCost),
            num(row.carrierInvoice),
            num(row.total)
          ]),
          ...(data.orders.length
            ? [
                [
                  text(t('planning.reports.totals')),
                  text(''),
                  text(''),
                  text(''),
                  num(data.totals.vehicleCost),
                  num(data.totals.fuelCost),
                  num(data.totals.carrierInvoice),
                  num(data.totals.total)
                ]
              ]
            : [])
        ]
      }
    ]
  })

  const quality = computed<ReportTable[]>(() => {
    const data = report.value?.quality
    if (!data) return []
    const satisfaction = data.satisfaction
    return [
      {
        title: t('planning.reports.quality.title'),
        headers: [col('indicator'), col('count'), col('rate')],
        numeric: [false, true, true],
        rows: [
          [text(t('planning.reports.quality.concerned')), num(data.concerned), text('')],
          ...OUTCOME_KEYS.map((key) => [
            text(t(`planning.reports.quality.${key}`)),
            num(data[key]),
            pct(data.rates[key])
          ])
        ]
      },
      {
        title: t('planning.reports.quality.satisfaction'),
        headers: [col('indicator'), col('average'), col('answers')],
        numeric: [false, true, true],
        rows: [
          [
            text(t('planning.reports.quality.recipientScore')),
            num(satisfaction.recipientAverage, 1),
            num(satisfaction.recipientCount)
          ],
          [
            text(t('planning.reports.quality.ordererOrder')),
            num(satisfaction.ordererOrder, 1),
            num(satisfaction.ordererCount)
          ],
          [
            text(t('planning.reports.quality.ordererDelay')),
            num(satisfaction.ordererDelay, 1),
            num(satisfaction.ordererCount)
          ],
          [
            text(t('planning.reports.quality.ordererQuality')),
            num(satisfaction.ordererQuality, 1),
            num(satisfaction.ordererCount)
          ]
        ]
      },
      {
        title: t('planning.reports.quality.fuelGaps'),
        headers: [
          col('order'),
          col('recipient'),
          col('product'),
          col('gap15'),
          col('qualification')
        ],
        numeric: [false, false, false, true, false],
        rows: data.fuelGaps.rows.map((row) => [
          text(`${row.orderNo} · ${row.lineNo}`),
          text(row.recipientName),
          text(row.productName),
          num(row.gap),
          text(
            row.qualification
              ? t(`planning.reports.quality.gap.${row.qualification}`)
              : t('planning.reports.quality.gap.none')
          )
        ])
      }
    ]
  })

  const means = computed<ReportTable[]>(() => {
    const data = report.value?.means
    if (!data) return []
    return [
      {
        title: t('planning.reports.means.title'),
        headers: [
          col('order'),
          col('means'),
          col('vehicle'),
          col('weightKg'),
          col('capacityKg'),
          col('weightRate'),
          col('volumeL'),
          col('capacityL'),
          col('volumeRate'),
          col('deliveries'),
          col('distanceKm')
        ],
        numeric: [false, false, false, true, true, true, true, true, true, true, true],
        rows: [
          ...data.orders.map((row) => [
            text(row.orderNo),
            text(meansLabel(row.means)),
            text(
              row.means === 'carrier' ? `${row.carrierName} ${row.vehiclePlate}` : row.vehiclePlate
            ),
            num(row.weightKg),
            num(row.capacityKg),
            pct(row.weightRate),
            num(row.volumeL),
            num(row.capacityL),
            pct(row.volumeRate),
            num(row.deliveries),
            num(row.distanceKm)
          ]),
          ...(data.orders.length
            ? [
                [
                  text(t('planning.reports.averages')),
                  text(''),
                  text(''),
                  text(''),
                  text(''),
                  pct(data.averages.weightRate),
                  text(''),
                  text(''),
                  pct(data.averages.volumeRate),
                  num(data.averages.deliveries, 1),
                  num(data.averages.distanceKm)
                ]
              ]
            : [])
        ]
      }
    ]
  })

  const carriers = computed<ReportTable[]>(() => {
    const rows = report.value?.carriers
    if (!rows) return []
    return [
      {
        title: t('planning.reports.section'),
        headers: [
          col('carrier'),
          col('orders'),
          col('punctuality'),
          col('confirmation'),
          col('contestation'),
          col('refusals'),
          col('partials'),
          col('invoices'),
          col('invoicesOutside'),
          col('invoiceGap'),
          col('withoutTariff')
        ],
        numeric: [false, true, true, true, true, true, true, true, true, true, true],
        rows: rows.map((row) => [
          text(row.carrierName ? `${row.carrierName} (${row.carrierNo})` : row.carrierNo),
          num(row.orders),
          pct(row.punctuality),
          pct(row.confirmation),
          pct(row.contestation),
          num(row.refusals),
          num(row.partials),
          num(row.invoices),
          num(row.invoicesOutside),
          num(row.invoiceGap),
          num(row.withoutTariff)
        ])
      }
    ]
  })

  return { punctuality, costs, quality, means, carriers }
}
