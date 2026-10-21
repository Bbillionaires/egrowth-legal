import { test } from 'node:test'
import assert from 'node:assert/strict'
import { address, newOrgPayload } from './fixtures'
import { prepareForSave } from './payload'
import { validateIntake } from './validate'

test('a complete payload passes through unchanged and valid', () => {
  const prepared = prepareForSave(newOrgPayload())
  assert.deepEqual(prepared, newOrgPayload())
  assert.equal(validateIntake(prepared, { mode: 'final' }).ok, true)
})

test('blank inputs and empty objects are dropped', () => {
  const p = newOrgPayload()
  p.answers.organization.mailing_address = { line1: '', city: '  ' }
  p.answers.applicant.name = ''
  const prepared = prepareForSave(p)
  assert.equal('mailing_address' in prepared.answers.organization, false)
  assert.equal('name' in prepared.answers.applicant, false)
})

test('answers to hidden questions are removed', () => {
  const p = newOrgPayload()
  p.answers.organization.existing = { state: 'FL', incorporation_date: '2019-05-01', entity_id: 'X', prior_irs_status: 'none' }
  p.answers.finance.actual_years = [{ year: 2025, receipts: { donations: 1 }, expenses: { program: 1 } }]
  p.answers.agent = { kind: 'need_service', name: 'Sam Lee', florida_street_address: { ...address }, accepted: null }
  p.answers.fundraising = { florida_solicitation: false, paid_personnel: null, methods: { online: true } }
  p.answers.governance.directors[0].compensation_amount = 500
  p.answers.screen = { flags: ['lobbying'], details: { lobbying: 'City council testimony.', gaming: 'Raffle at the gala.' } }

  const prepared = prepareForSave(p)
  const a = prepared.answers
  assert.equal(a.organization.existing, undefined)
  assert.equal(a.finance.actual_years, undefined)
  assert.deepEqual(a.agent, { kind: 'need_service' })
  assert.deepEqual(a.fundraising, { florida_solicitation: false })
  assert.equal('compensation_amount' in a.governance.directors[0], false)
  assert.deepEqual(a.screen.details, { lobbying: 'City council testimony.' })
  assert.deepEqual(prepared.unknown_fields, [])
  assert.equal(validateIntake(prepared, { mode: 'final' }).ok, true, JSON.stringify(validateIntake(prepared, { mode: 'final' }).errors))
})

test('unknown_fields is rebuilt from the null answers', () => {
  const p = newOrgPayload()
  p.answers.governance.directors.push({ ...p.answers.governance.directors[0], id: 'd2', compensated: true, compensation_amount: null })
  p.answers.finance.asset_fmv = null
  p.unknown_fields = ['/fundraising/paid_personnel']
  assert.deepEqual(prepareForSave(p).unknown_fields, ['/governance/directors/1/compensation_amount', '/finance/asset_fmv'])
})

test('removing a director moves its unknown marker with the remaining ones', () => {
  const p = newOrgPayload()
  const base = p.answers.governance.directors[0]
  p.answers.governance.directors = [
    { ...base, id: 'd1' },
    { ...base, id: 'd2', compensated: true, compensation_amount: null },
  ]
  p.answers.governance.directors.splice(0, 1)
  assert.deepEqual(prepareForSave(p).unknown_fields, ['/governance/directors/0/compensation_amount'])
})
