import type { TrainingStatus } from '../domain/training'

export const TRAINING_REASONS = ['score', 'accident', 'incident', 'infraction', 'other'] as const
export type TrainingReason = (typeof TRAINING_REASONS)[number]

export interface TrainingApi {
  no: string
  employeeNo: string
  topic: string
  reason: TrainingReason
  /** Infraction, claim or score period that led to the training. */
  originNo: string
  plannedOn: string | null
  trainer: string
  attendedOn: string | null
  result: string
  cancelledAt: string | null
  cancelReason: string
  employeeName: string
  status: TrainingStatus
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type TrainingSearchColumn =
  | 'no'
  | 'employeeName'
  | 'topic'
  | 'originNo'
  | 'no,employeeName,topic,originNo'
