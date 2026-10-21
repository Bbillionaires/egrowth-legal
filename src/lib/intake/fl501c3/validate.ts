import Ajv2020, { type ErrorObject } from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import schema from './fl_501c3_intake_schema.json'

// Validation for the Florida 501(c)(3) intake payload (see fl_501c3_form_spec.md).
//
// - final: the full schema plus the spec's semantic checks; required before submission.
// - draft: shape and format of whatever has been answered so far; nothing is required.
// Either mode can be limited to some answer sections, for checking one wizard step.

export const SECTIONS = [
  'applicant', 'organization', 'activities', 'governance', 'agent',
  'finance', 'fundraising', 'screen', 'documents', 'consent',
] as const
export type Section = typeof SECTIONS[number]
export type Mode = 'draft' | 'final'

export interface Issue {
  // JSON Pointer relative to answers ('' for the payload itself)
  path: string
  code: string
  message: string
}

export interface ValidationResult {
  ok: boolean
  errors: Issue[]
  warnings: Issue[]
}

export interface IntakePayload {
  schema_version: string
  unknown_fields: string[]
  answers: Record<string, any>
}

// Fields the spec allows to be answered as unknown (null + listed in unknown_fields)
const UNKNOWN_ALLOWED = [
  /^\/organization\/existing\/ein$/,
  /^\/organization\/existing\/prior_irs_status$/,
  /^\/governance\/directors\/\d+\/compensation_amount$/,
  /^\/agent\/accepted$/,
  /^\/finance\/asset_fmv$/,
  /^\/finance\/public_charity_basis$/,
  /^\/fundraising\/prior_contributions$/,
  /^\/fundraising\/paid_personnel$/,
  /^\/fundraising\/professional_fundraiser$/,
]

// strictTypes is off because the schema's if/then/not branches narrow fields whose type is set elsewhere
const ajv = new Ajv2020({ allErrors: true, strictTypes: false })
addFormats(ajv)
const validateFinalSchema = ajv.compile(schema)
const validateDraftSchema = ajv.compile(toDraftSchema(schema))

// Drafts may leave anything unanswered: drop every "required" and minimum array size.
// Rules that reject hidden fields ("not": {"required": ...}) stay in force.
function toDraftSchema(node: any, underNot = false): any {
  if (Array.isArray(node)) return node.map(n => toDraftSchema(n, underNot))
  if (!node || typeof node !== 'object') return node
  const out: any = {}
  for (const [key, value] of Object.entries(node)) {
    if (!underNot && (key === 'required' || key === 'minItems' || key === 'minProperties')) continue
    if (key === '$id') { out[key] = `${value}:draft`; continue }
    out[key] = toDraftSchema(value, underNot || key === 'not')
  }
  return out
}

export function validateIntake(
  payload: unknown,
  { mode, sections }: { mode: Mode; sections?: Section[] },
): ValidationResult {
  const errors: Issue[] = []
  const warnings: Issue[] = []
  const check = mode === 'final' ? validateFinalSchema : validateDraftSchema

  if (!check(payload)) errors.push(...(check.errors ?? []).filter(e => e.keyword !== 'if').map(toIssue))

  if (isPayloadShape(payload)) semanticChecks(payload, mode, errors, warnings)

  const inScope = (issue: Issue) => !sections || sections.some(s => issue.path === `/${s}` || issue.path.startsWith(`/${s}/`))
  const scopedErrors = dedupe(errors.filter(inScope))
  return { ok: scopedErrors.length === 0, errors: scopedErrors, warnings: dedupe(warnings.filter(inScope)) }
}

function isPayloadShape(payload: unknown): payload is IntakePayload {
  const p = payload as IntakePayload
  return !!p && typeof p === 'object' && !!p.answers && typeof p.answers === 'object'
    && (p.unknown_fields === undefined || Array.isArray(p.unknown_fields))
}

function semanticChecks(payload: IntakePayload, mode: Mode, errors: Issue[], warnings: Issue[]) {
  const a = payload.answers
  const final = mode === 'final'

  // 1. unknown_fields lists exactly the null answers, and only fields that may be unknown
  const nulls = new Set(findNullPointers(a))
  const listed = new Set(payload.unknown_fields ?? [])
  for (const pointer of Array.from(listed)) {
    if (!UNKNOWN_ALLOWED.some(r => r.test(pointer))) {
      errors.push({ path: pointer, code: 'unknown_not_allowed', message: 'This question must be answered; it cannot be marked unknown.' })
    } else if (!nulls.has(pointer)) {
      errors.push({ path: pointer, code: 'unknown_has_value', message: 'Marked unknown but has an answer. Clear the answer or remove the unknown marker.' })
    }
  }
  for (const pointer of Array.from(nulls)) {
    if (!listed.has(pointer)) {
      errors.push({ path: pointer, code: 'unknown_not_marked', message: 'Empty answer is not marked unknown.' })
    }
  }

  // 2. activity resources total 100%
  if (final && Array.isArray(a.activities) && a.activities.length > 0) {
    const total = a.activities.reduce((sum: number, act: any) => sum + (typeof act?.percent_resources === 'number' ? act.percent_resources : 0), 0)
    if (Math.abs(total - 100) > 0.01) {
      errors.push({ path: '/activities', code: 'percent_total', message: `Activity resources must total 100% (currently ${round(total)}%).` })
    }
  }

  // 3. screening details only for selected flags; campaign activity stops the intake
  const flags: string[] = Array.isArray(a.screen?.flags) ? a.screen.flags : []
  if (a.screen?.details && typeof a.screen.details === 'object') {
    for (const key of Object.keys(a.screen.details)) {
      if (!flags.includes(key)) {
        errors.push({ path: `/screen/details/${key}`, code: 'detail_without_flag', message: 'Explanation given for an item that is not selected.' })
      }
    }
  }
  if (flags.includes('campaign_activity')) {
    const issue = { path: '/screen/flags', code: 'campaign_activity', message: 'Political campaign activity is not allowed for a 501(c)(3). This intake must be escalated to a reviewer before it can continue.' }
    ;(final ? errors : warnings).push(issue)
  }

  // 4. projection years: three distinct consecutive years; actual years distinct
  if (Array.isArray(a.finance?.projections)) {
    const years = a.finance.projections.map((y: any) => y?.year).filter((y: any) => Number.isInteger(y)).sort((x: number, y: number) => x - y)
    if (new Set(years).size !== years.length) {
      errors.push({ path: '/finance/projections', code: 'duplicate_year', message: 'Each projection must be for a different year.' })
    } else if (final && years.length === 3 && years[2] - years[0] !== 2) {
      errors.push({ path: '/finance/projections', code: 'nonconsecutive_years', message: 'Projections must cover three consecutive years.' })
    }
  }
  if (Array.isArray(a.finance?.actual_years)) {
    const years = a.finance.actual_years.map((y: any) => y?.year)
    if (new Set(years).size !== years.length) {
      errors.push({ path: '/finance/actual_years', code: 'duplicate_year', message: 'Each year of actual results must be different.' })
    }
  }

  // 5. fiscal year end is a real calendar day
  const fye = a.finance?.fiscal_year_end
  if (typeof fye === 'string' && /^\d{2}-\d{2}$/.test(fye)) {
    const [month, day] = fye.split('-').map(Number)
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
    if (!daysInMonth || day > daysInMonth) {
      errors.push({ path: '/finance/fiscal_year_end', code: 'invalid_date', message: 'Fiscal year end is not a real date.' })
    }
  }

  // 6. director ids unique; officer director_id refers to a director
  const directors: any[] = Array.isArray(a.governance?.directors) ? a.governance.directors : []
  const ids = directors.map(d => d?.id).filter(Boolean)
  if (new Set(ids).size !== ids.length) {
    errors.push({ path: '/governance/directors', code: 'duplicate_director_id', message: 'Each director needs a unique id.' })
  }
  if (Array.isArray(a.governance?.officers)) {
    a.governance.officers.forEach((o: any, i: number) => {
      if (o?.director_id && !ids.includes(o.director_id)) {
        errors.push({ path: `/governance/officers/${i}/director_id`, code: 'unknown_director', message: 'Linked director does not exist.' })
      }
    })
  }
  if (directors.length > 0 && directors.length < 3) {
    warnings.push({ path: '/governance/directors', code: 'few_directors', message: 'Fewer than three directors. The IRS and Florida accept this, but it will be flagged for review.' })
  }
}

function findNullPointers(node: unknown, base = ''): string[] {
  if (node === null) return [base]
  if (Array.isArray(node)) return node.flatMap((v, i) => findNullPointers(v, `${base}/${i}`))
  if (typeof node === 'object' && node) {
    return Object.entries(node).flatMap(([k, v]) => findNullPointers(v, `${base}/${escapePointer(k)}`))
  }
  return []
}

function escapePointer(key: string) {
  return key.replace(/~/g, '~0').replace(/\//g, '~1')
}

// Converts an Ajv error to a path relative to answers and a readable message
function toIssue(e: ErrorObject): Issue {
  let path = e.instancePath.replace(/^\/answers/, '')
  if (e.keyword === 'required') path += `/${escapePointer((e.params as { missingProperty: string }).missingProperty)}`
  if (e.keyword === 'additionalProperties') path += `/${escapePointer((e.params as { additionalProperty: string }).additionalProperty)}`
  const messages: Record<string, string> = {
    required: 'This question needs an answer.',
    not: 'Remove answers to questions that no longer apply.',
    additionalProperties: 'Unexpected field.',
    minItems: `Add at least ${(e.params as { limit?: number }).limit} item(s).`,
    maxItems: `No more than ${(e.params as { limit?: number }).limit} item(s).`,
  }
  return { path, code: e.keyword, message: messages[e.keyword] ?? `Invalid value: ${e.message}` }
}

function dedupe(issues: Issue[]) {
  const seen = new Set<string>()
  return issues.filter(i => {
    const key = `${i.path}|${i.code}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function round(n: number) {
  return Math.round(n * 100) / 100
}
