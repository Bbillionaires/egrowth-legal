import { findNullPointers } from './pointers'
import type { IntakePayload } from './validate'

export const SCHEMA_VERSION = '2.0.0'

// Interviews store the intake under this key of interviews.answers
export const ANSWERS_KEY = 'fl_501c3'

export function emptyPayload(): IntakePayload {
  return { schema_version: SCHEMA_VERSION, unknown_fields: [], answers: {} }
}

// Readies wizard state for saving: drops blank inputs and answers to questions that are
// hidden by other answers, then lists every null ("I don't know") answer in unknown_fields.
// The wizard only writes null for "I don't know", so the two always match.
export function prepareForSave(payload: IntakePayload): IntakePayload {
  const a: Record<string, any> = dropBlanks(structuredClone(payload.answers)) ?? {}

  if (a.organization?.status === 'new') {
    delete a.organization.existing
    if (a.finance) delete a.finance.actual_years
  }
  if (a.agent?.kind === 'need_service') {
    delete a.agent.name
    delete a.agent.florida_street_address
    delete a.agent.accepted
  }
  if (a.fundraising && a.fundraising.florida_solicitation !== true) {
    for (const k of ['prior_contributions', 'paid_personnel', 'professional_fundraiser', 'methods']) delete a.fundraising[k]
  }
  for (const d of a.governance?.directors ?? []) {
    if (d && d.compensated !== true) delete d.compensation_amount
  }
  if (a.screen) {
    const flags: string[] = a.screen.flags ?? []
    if (a.screen.details) {
      for (const key of Object.keys(a.screen.details)) if (!flags.includes(key)) delete a.screen.details[key]
      if (Object.keys(a.screen.details).length === 0) delete a.screen.details
    }
  }

  const answers = dropBlanks(a) ?? {}
  return { schema_version: SCHEMA_VERSION, answers, unknown_fields: findNullPointers(answers) }
}

// Removes empty strings, undefined and empty objects; keeps null (unknown) and arrays
function dropBlanks(node: any): any {
  if (node === null) return null
  if (Array.isArray(node)) return node.map(v => dropBlanks(v) ?? {})
  if (typeof node === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(node)) {
      const cleaned = dropBlanks(v)
      if (cleaned !== undefined) out[k] = cleaned
    }
    return Object.keys(out).length ? out : undefined
  }
  if (typeof node === 'string') return node.trim() === '' ? undefined : node
  return node
}
