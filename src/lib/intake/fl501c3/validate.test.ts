import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newOrgPayload } from './fixtures'
import { emptyPayload } from './payload'
import { validateIntake, type Issue } from './validate'

function finalResult(mutate: (p: ReturnType<typeof newOrgPayload>) => void = () => {}) {
  const payload = newOrgPayload()
  mutate(payload)
  return validateIntake(payload, { mode: 'final' })
}

const codes = (issues: Issue[]) => issues.map(i => `${i.path} ${i.code}`)

test('a complete payload passes final validation', () => {
  const result = finalResult()
  assert.equal(result.ok, true, JSON.stringify(result.errors))
})

test('an empty draft can be saved but not submitted', () => {
  assert.equal(validateIntake(emptyPayload(), { mode: 'draft' }).ok, true)
  const final = validateIntake(emptyPayload(), { mode: 'final' })
  assert.equal(final.ok, false)
  // each missing question is reported, not just the missing section
  assert.ok(codes(final.errors).includes('/applicant/name required'))
  assert.ok(codes(final.errors).includes('/activities minItems'))
  assert.equal(codes(final.errors).includes('/applicant required'), false)
})

test('drafts still reject malformed answers and hidden fields', () => {
  const draft = emptyPayload()
  draft.answers = { applicant: { phone: '813-555-0100' } }
  assert.deepEqual(codes(validateIntake(draft, { mode: 'draft' }).errors), ['/applicant/phone pattern'])

  draft.answers = { fundraising: { florida_solicitation: false, paid_personnel: true } }
  assert.deepEqual(codes(validateIntake(draft, { mode: 'draft' }).errors), ['/fundraising not'])
})

test('sections limit the check to one step', () => {
  const draft = emptyPayload()
  draft.answers = { applicant: { name: 'Ana Ruiz', email: 'ana@example.org', phone: '+18135550100', role: 'founder', authorized: true } }
  assert.equal(validateIntake(draft, { mode: 'final', sections: ['applicant'] }).ok, true)
  assert.equal(validateIntake(draft, { mode: 'final', sections: ['organization'] }).ok, false)
})

test('unknown answers must be null and marked, and only where allowed', () => {
  assert.equal(finalResult(p => {
    p.answers.finance.asset_fmv = null
    p.unknown_fields = ['/finance/asset_fmv']
  }).ok, true)

  assert.deepEqual(codes(finalResult(p => { p.answers.finance.asset_fmv = null }).errors), ['/finance/asset_fmv unknown_not_marked'])
  assert.deepEqual(codes(finalResult(p => { p.unknown_fields = ['/finance/asset_fmv'] }).errors), ['/finance/asset_fmv unknown_has_value'])
  assert.ok(codes(finalResult(p => { p.unknown_fields = ['/applicant/authorized'] }).errors).includes('/applicant/authorized unknown_not_allowed'))
})

test('a paid director with an unknown amount is accepted', () => {
  const result = finalResult(p => {
    p.answers.governance.directors[0].compensated = true
    p.answers.governance.directors[0].compensation_amount = null
    p.unknown_fields = ['/governance/directors/0/compensation_amount']
  })
  assert.equal(result.ok, true, JSON.stringify(result.errors))
})

test('activity resources must total 100%', () => {
  const result = finalResult(p => {
    p.answers.activities[0].percent_resources = 60
    p.answers.activities.push({ ...p.answers.activities[0], name: 'Pantry', percent_resources: 30 })
  })
  assert.deepEqual(codes(result.errors), ['/activities percent_total'])
})

test('screening explanations only for selected flags', () => {
  const result = finalResult(p => { p.answers.screen.details = { gaming: 'Annual raffle at the gala.' } })
  assert.ok(codes(result.errors).includes('/screen/details/gaming detail_without_flag'))
})

test('campaign activity warns in a draft and blocks submission', () => {
  const mutate = (p: ReturnType<typeof newOrgPayload>) => {
    p.answers.screen = { flags: ['campaign_activity'], details: { campaign_activity: 'Endorsing a mayoral candidate.' } }
  }
  const payload = newOrgPayload()
  mutate(payload)
  const draft = validateIntake(payload, { mode: 'draft' })
  assert.equal(draft.ok, true)
  assert.ok(codes(draft.warnings).includes('/screen/flags campaign_activity'))
  assert.ok(codes(finalResult(mutate).errors).includes('/screen/flags campaign_activity'))
})

test('projections cover three different consecutive years', () => {
  assert.deepEqual(codes(finalResult(p => { p.answers.finance.projections[2].year = 2027 }).errors), ['/finance/projections duplicate_year'])
  assert.deepEqual(codes(finalResult(p => { p.answers.finance.projections[2].year = 2031 }).errors), ['/finance/projections nonconsecutive_years'])
})

test('fiscal year end must be a real date', () => {
  assert.deepEqual(codes(finalResult(p => { p.answers.finance.fiscal_year_end = '02-30' }).errors), ['/finance/fiscal_year_end invalid_date'])
  assert.equal(finalResult(p => { p.answers.finance.fiscal_year_end = '02-29' }).ok, true)
})

test('director ids are unique and officers link to real directors', () => {
  assert.ok(codes(finalResult(p => {
    p.answers.governance.directors.push({ ...p.answers.governance.directors[0] })
  }).errors).includes('/governance/directors duplicate_director_id'))
  assert.deepEqual(codes(finalResult(p => { p.answers.governance.officers[0].director_id = 'd9' }).errors), ['/governance/officers/0/director_id unknown_director'])
})

test('fewer than three directors is a warning, not an error', () => {
  const result = finalResult()
  assert.equal(result.ok, true)
  assert.deepEqual(codes(result.warnings), ['/governance/directors few_directors'])
})
