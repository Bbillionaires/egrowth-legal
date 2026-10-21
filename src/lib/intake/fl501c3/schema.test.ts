import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { address, newOrgPayload } from './fixtures'

const schema = JSON.parse(readFileSync(join(__dirname, 'fl_501c3_intake_schema.json'), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strictTypes: false })
addFormats(ajv)
const validate = ajv.compile(schema)

function check(mutate: (p: ReturnType<typeof newOrgPayload>) => void) {
  const payload = newOrgPayload()
  mutate(payload)
  return validate(payload)
}

test('a complete new-organization payload is valid', () => {
  assert.equal(check(() => {}), true, JSON.stringify(validate.errors))
})

test('address line 2 is accepted', () => {
  assert.equal(check(p => { p.answers.organization.principal_address.line2 = 'Suite 4' }), true)
})

test('existing organizations must describe the existing entity', () => {
  assert.equal(check(p => { p.answers.organization.status = 'existing_florida' }), false)
  assert.equal(check(p => {
    p.answers.organization.status = 'existing_florida'
    p.answers.organization.existing = { state: 'FL', incorporation_date: '2019-05-01', entity_id: 'N19000001234', prior_irs_status: 'none' }
  }), true, JSON.stringify(validate.errors))
})

test('new organizations cannot carry existing-entity details or actual years', () => {
  assert.equal(check(p => { p.answers.organization.existing = { state: 'FL', incorporation_date: '2019-05-01', entity_id: 'X', prior_irs_status: 'none' } }), false)
  assert.equal(check(p => { p.answers.finance.actual_years = [{ year: 2025, receipts: {}, expenses: {} }] }), false)
})

test('each selected screening flag needs its own explanation', () => {
  assert.equal(check(p => { p.answers.screen.flags = ['lobbying'] }), false)
  assert.equal(check(p => {
    p.answers.screen.flags = ['lobbying', 'gaming']
    p.answers.screen.details = { lobbying: 'Occasional testimony at city council.' }
  }), false)
  assert.equal(check(p => {
    p.answers.screen.flags = ['lobbying']
    p.answers.screen.details = { lobbying: 'Occasional testimony at city council.' }
  }), true, JSON.stringify(validate.errors))
})

test('length and count limits from the spec are enforced', () => {
  assert.equal(check(p => { p.answers.organization.mission = 'm'.repeat(1001) }), false)
  assert.equal(check(p => { p.answers.finance.projections = [] }), false)
  assert.equal(check(p => { p.answers.organization.geography = [] }), false)
  assert.equal(check(p => { p.answers.finance.funding_sources = [] }), false)
})

test('applicant phone must be E.164', () => {
  assert.equal(check(p => { p.answers.applicant.phone = '813-555-0100' }), false)
})

test('registered agent needs a Florida street address that is not a PO box', () => {
  const agent = { kind: 'individual', name: 'Sam Lee', florida_street_address: { ...address }, accepted: true }
  assert.equal(check(p => { p.answers.agent = agent }), true, JSON.stringify(validate.errors))
  assert.equal(check(p => { p.answers.agent = { ...agent, florida_street_address: { ...address, state: 'GA' } } }), false)
  assert.equal(check(p => { p.answers.agent = { ...agent, florida_street_address: { ...address, line1: 'PO Box 12' } } }), false)
  assert.equal(check(p => { p.answers.agent = { ...agent, florida_street_address: { ...address, line1: 'P.O. Box 12' } } }), false)
  assert.equal(check(p => { p.answers.agent = { kind: 'individual' } }), false)
  assert.equal(check(p => { p.answers.agent = { kind: 'need_service', name: 'Sam Lee' } }), false)
})

test('paid directors need a compensation amount, unpaid directors cannot have one', () => {
  assert.equal(check(p => { p.answers.governance.directors[0].compensated = true }), false)
  assert.equal(check(p => {
    p.answers.governance.directors[0].compensated = true
    p.answers.governance.directors[0].compensation_amount = 12000
  }), true)
  assert.equal(check(p => { p.answers.governance.directors[0].compensation_amount = 0 }), false)
})

test('Florida solicitation questions appear only when soliciting in Florida', () => {
  assert.equal(check(p => { p.answers.fundraising = { florida_solicitation: true } }), false)
  assert.equal(check(p => {
    p.answers.fundraising = { florida_solicitation: true, paid_personnel: false, professional_fundraiser: false, methods: { online: true } }
  }), true, JSON.stringify(validate.errors))
  assert.equal(check(p => { p.answers.fundraising = { florida_solicitation: false, paid_personnel: false } }), false)
})

test('unknown answers are null and listed in unknown_fields', () => {
  assert.equal(check(p => {
    p.answers.fundraising = { florida_solicitation: true, prior_contributions: null, paid_personnel: null, professional_fundraiser: false, methods: { events: true } }
    p.answers.finance.asset_fmv = null
    p.unknown_fields = ['/fundraising/prior_contributions', '/fundraising/paid_personnel', '/finance/asset_fmv']
  }), true, JSON.stringify(validate.errors))
  // fields that must always be known stay non-nullable
  assert.equal(check(p => { p.answers.applicant.authorized = null }), false)
  assert.equal(check(p => { p.answers.consent.prepare = null }), false)
})

test('uploads must be PDF, DOCX or XLSX', () => {
  assert.equal(check(p => { p.answers.documents = { uploads: [{ file_id: 'f1', name: 'Bylaws.PDF' }] } }), true)
  assert.equal(check(p => { p.answers.documents = { uploads: [{ file_id: 'f1', name: 'bylaws.exe' }] } }), false)
})
