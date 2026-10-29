import {
  ALERT_RULE_SEVERITIES,
  type AlertRuleApi,
  type AlertRuleSeverity
} from '@/modules/fleet/alert-rules/types/alertRule.types'
import { isValidEmail } from '@/utils/email'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { AlertRuleRow } from '../../fixtures/fleet/alertRules'
import { registerCrudResource } from '../../http/crudResource'
import { unprocessable } from '../../http/errors'
import {
  invalidField,
  readBoolean,
  readEnum,
  readNumber,
  readPatch,
  readString,
  readStringList,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'
import { localize, type LocalizedText, type MockLanguage } from '../../i18n'
import { fleetSettings } from './settings'

type Fields = Omit<AlertRuleRow, 'no' | keyof AuditFields>

export const ALERT_RULE_MESSAGES = {
  emailToRequired: {
    fr: "L'envoi par e-mail demande au moins une adresse.",
    en: 'Sending by e-mail needs at least one address.'
  },
  smsToRequired: {
    fr: "L'envoi par SMS demande au moins un numéro.",
    en: 'Sending by SMS needs at least one number.'
  }
} satisfies Record<string, LocalizedText>

/**
 * When each event raises an alert. The threshold stays set where the event is defined (a notice
 * on a document type, a tolerance in the settings…) and is read here, so that it lives in one
 * place only.
 */
const THRESHOLDS: Record<string, { text: LocalizedText; path: string }> = {
  document: {
    text: {
      fr: "Avant expiration, selon le préavis de chaque type de document ({days} jours par défaut) ; dès qu'un document obligatoire manque",
      en: 'Before expiry, after the notice of each document type ({days} days by default); as soon as a mandatory document is missing'
    },
    path: '/fleet/document-types'
  },
  companyDocument: {
    text: {
      fr: "Dès le dépôt d'un document, jusqu'à sa validation",
      en: 'As soon as a document is filed, until it is approved'
    },
    path: ''
  },
  checklist: {
    text: {
      fr: "Dès qu'un point de la check-list est noté en anomalie",
      en: 'As soon as a point of the checklist is marked as an anomaly'
    },
    path: '/fleet/check-points'
  },
  infraction: {
    text: {
      fr: "Dès qu'une infraction est enregistrée",
      en: 'As soon as an infraction is recorded'
    },
    path: '/fleet/infraction-types'
  },
  training: {
    text: { fr: "Dès qu'une formation est à planifier", en: 'As soon as a training is to plan' },
    path: '/fleet/trainings'
  },
  departure: {
    text: {
      fr: "Dès qu'un départ attend une décision",
      en: 'As soon as a departure awaits a decision'
    },
    path: ''
  },
  equipment: {
    text: {
      fr: "Avant l'échéance, selon le préavis de chaque type d'équipement",
      en: 'Before the due date, after the notice of each equipment type'
    },
    path: '/fleet/equipment-types'
  },
  inspection: {
    text: {
      fr: 'Contre-visite à passer dans les {days} jours après une inspection non conforme',
      en: 'Re-inspection due within {days} days of a non-conforming inspection'
    },
    path: '/fleet/settings'
  },
  deviation: {
    text: {
      fr: "Selon le seuil et la gravité de chaque type d'écart",
      en: 'After the threshold and severity of each deviation type'
    },
    path: '/fleet/deviation-types'
  },
  insurance: {
    text: {
      fr: "Avant l'échéance, selon le préavis de chaque police",
      en: 'Before the end date, after the notice of each policy'
    },
    path: '/fleet/insurance-policies'
  },
  telematics: {
    text: {
      fr: "Pour les types d'événements marqués comme déclenchant une alerte",
      en: 'For the event types marked as raising an alert'
    },
    path: '/fleet/telematics-event-types'
  },
  driverScore: {
    text: {
      fr: 'Score de conduite sous {threshold} sur les {period} derniers jours',
      en: 'Driving score below {threshold} over the last {period} days'
    },
    path: '/fleet/settings'
  },
  tyre: {
    text: {
      fr: "Selon les seuils d'usure, de pression et de permutation des pneus",
      en: 'After the wear, pressure and rotation thresholds of the tyres'
    },
    path: '/maintenance/settings'
  },
  service: {
    text: {
      fr: "Selon l'échéance des opérations du plan d'entretien",
      en: 'After the due point of the operations of the maintenance plan'
    },
    path: '/maintenance/maintenance-plans'
  }
}

const NO_THRESHOLD: LocalizedText = {
  fr: 'Dès que la situation se présente',
  en: 'As soon as the situation arises'
}

export function alertRuleThreshold(
  db: MockDatabase,
  category: string,
  language: MockLanguage
): { threshold: string; thresholdPath: string } {
  const settings = fleetSettings(db)
  const entry = THRESHOLDS[category]
  return {
    threshold: localize(language, entry?.text ?? NO_THRESHOLD, {
      days:
        category === 'inspection'
          ? settings.safety.recheckDelayDays
          : settings.documents.defaultNoticeDays,
      threshold: settings.driverScore.trainingThreshold,
      period: settings.driverScore.periodDays
    }),
    thresholdPath: entry?.path ?? ''
  }
}

/** A rule with its channels, defaulted for a record saved before they existed. */
export function alertRuleOf(row: AlertRuleRow): Omit<AlertRuleApi, 'threshold' | 'thresholdPath'> {
  return {
    ...row,
    severity: row.severity ?? 'by_case',
    email: row.email ?? false,
    sms: row.sms ?? false,
    emailTo: row.emailTo ?? [],
    smsTo: row.smsTo ?? []
  }
}

export function alertRulesApi(db: MockDatabase, language: MockLanguage = 'fr'): AlertRuleApi[] {
  return db.alertRules
    .all()
    .map((row) => ({ ...alertRuleOf(row), ...alertRuleThreshold(db, row.no, language) }))
}

const PHONE = /^\+?[0-9 ]{6,20}$/

export function registerAlertRulesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    recipients: (input) => readStringList(input, 'recipients'),
    escalationHours: (input) =>
      readNumber(input, 'escalationHours', { required: true, min: 1, max: 720 }) ?? 0,
    escalateTo: (input) => readString(input, 'escalateTo'),
    active: (input) => readBoolean(input, 'active', true),
    severity: (input) =>
      (readEnum(input, 'severity', ALERT_RULE_SEVERITIES) ?? 'by_case') as AlertRuleSeverity,
    email: (input) => readBoolean(input, 'email'),
    sms: (input) => readBoolean(input, 'sms'),
    emailTo: (input) => {
      const list = readStringList(input, 'emailTo')
      if (list.some((address) => !isValidEmail(address))) throw invalidField('emailTo')
      return list
    },
    smsTo: (input) => {
      const list = readStringList(input, 'smsTo')
      if (list.some((number) => !PHONE.test(number))) throw invalidField('smsTo')
      return list
    }
  }

  /** A channel switched on needs somewhere to send to. */
  function assertChannels(rule: Partial<AlertRuleRow>) {
    if (rule.email && !rule.emailTo?.length) {
      throw unprocessable(ALERT_RULE_MESSAGES.emailToRequired)
    }
    if (rule.sms && !rule.smsTo?.length) throw unprocessable(ALERT_RULE_MESSAGES.smsToRequired)
  }

  registerCrudResource(router, {
    basePath: '/fleet/alert-rules',
    feature: 'ALERTRULE',
    collection: db.alertRules,
    list: (request) => alertRulesApi(db, request.language),
    searchColumns: ['no', 'name'],
    optionFields: { severity: 'alertRuleSeverity' },
    update: (existing, input) => {
      const patch = readPatch(input, readers)
      assertChannels({ ...alertRuleOf(existing), ...patch })
      return patch
    }
  })
}
