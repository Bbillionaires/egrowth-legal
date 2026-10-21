import type { IntakePayload } from './validate'

export const SCHEMA_VERSION = '2.0.0'

// Interviews store the intake under this key of interviews.answers
export const ANSWERS_KEY = 'fl_501c3'

export function emptyPayload(): IntakePayload {
  return { schema_version: SCHEMA_VERSION, unknown_fields: [], answers: {} }
}
