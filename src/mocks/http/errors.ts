import type { ApiErrorResponse } from '@/types/api-response.types'
import { COMMON_MESSAGES, type LocalizedText, type MessageParams } from '../i18n'

export type ErrorExtra = Pick<
  ApiErrorResponse,
  'errorCode' | 'duplicateField' | 'duplicateValue' | 'errors'
>

/** Thrown by handlers; the router turns it into an error envelope in the request language. */
export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    readonly text: LocalizedText,
    readonly params?: MessageParams,
    readonly extra?: ErrorExtra
  ) {
    super(text.en)
    this.name = 'MockHttpError'
  }
}

export const badRequest = (text: LocalizedText, params?: MessageParams, extra?: ErrorExtra) =>
  new MockHttpError(400, text, params, extra)

export const unauthorized = () => new MockHttpError(401, COMMON_MESSAGES.unauthorized)

export const forbidden = (text: LocalizedText = COMMON_MESSAGES.forbidden) =>
  new MockHttpError(403, text)

export const notFound = (text: LocalizedText = COMMON_MESSAGES.notFound, params?: MessageParams) =>
  new MockHttpError(404, text, params)

export const conflict = (text: LocalizedText, params?: MessageParams, extra?: ErrorExtra) =>
  new MockHttpError(409, text, params, extra)

export const unprocessable = (text: LocalizedText, params?: MessageParams) =>
  new MockHttpError(422, text, params)

export function requiredField(field: string): MockHttpError {
  return badRequest(
    COMMON_MESSAGES.requiredField,
    { field },
    { errorCode: 'REQUIRED', errors: [field] }
  )
}
