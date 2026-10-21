'use client'
import { Plus, Trash2 } from 'lucide-react'
import {
  AddressFields, Choice, Field, MoneyInput, MultiCheck, Select, TextArea, TextInput, Unknowable, YES_NO, toE164,
} from './fields'

export type Path = (string | number)[]
export interface StepProps {
  a: Record<string, any>
  set: (path: Path, value: unknown) => void
  err: (pointer: string) => string | undefined
}

// ─── 1. Applicant ───────────────────────────
export function ApplicantStep({ a, set, err }: StepProps) {
  const ap = a.applicant ?? {}
  return (
    <>
      <Field label="Your full name" error={err('/applicant/name')}>
        <TextInput value={ap.name} onChange={v => set(['applicant', 'name'], v)} error={err('/applicant/name')} />
      </Field>
      <Field label="Email" error={err('/applicant/email')}>
        <TextInput type="email" value={ap.email} onChange={v => set(['applicant', 'email'], v)} error={err('/applicant/email')} />
      </Field>
      <Field label="Phone" hint="US numbers are converted to +1 format automatically." error={err('/applicant/phone') && 'Enter a full phone number, e.g. (813) 555-0100.'}>
        <TextInput type="tel" value={ap.phone} onChange={v => set(['applicant', 'phone'], toE164(v))} error={err('/applicant/phone')} />
      </Field>
      <Field label="Your role with the organization" error={err('/applicant/role')}>
        <Choice value={ap.role} onChange={v => set(['applicant', 'role'], v)} options={[
          { value: 'founder', label: 'Founder' }, { value: 'director', label: 'Director' },
          { value: 'authorized_agent', label: 'Authorized agent' }, { value: 'other', label: 'Other' },
        ]} />
      </Field>
      <Field label="Are you authorized to act for the organization?" error={err('/applicant/authorized')}>
        <Choice value={ap.authorized} onChange={v => set(['applicant', 'authorized'], v)} options={YES_NO} />
        {ap.authorized === false && (
          <p className="text-xs text-amber-700 mt-2">We can only prepare filings for someone authorized to act for the organization. A founder or director will need to complete this intake.</p>
        )}
      </Field>
    </>
  )
}

// ─── 2. Organization ────────────────────────
const PURPOSES = [
  { value: 'charitable', label: 'Charitable' }, { value: 'educational', label: 'Educational' },
  { value: 'religious', label: 'Religious' }, { value: 'scientific', label: 'Scientific' },
  { value: 'literary', label: 'Literary' }, { value: 'amateur_sports', label: 'Amateur sports competition' },
  { value: 'cruelty_prevention_children', label: 'Preventing cruelty to children' },
  { value: 'cruelty_prevention_animals', label: 'Preventing cruelty to animals' }, { value: 'other', label: 'Other' },
]

export function OrganizationStep({ a, set, err }: StepProps) {
  const o = a.organization ?? {}
  const names: string[] = o.names ?? ['']
  const ex = o.existing ?? {}
  return (
    <>
      <Field label="Is this a new organization?" error={err('/organization/status')}>
        <Choice value={o.status} onChange={v => set(['organization', 'status'], v)} options={[
          { value: 'new', label: 'New, not yet incorporated' },
          { value: 'existing_florida', label: 'Already a Florida corporation' },
          { value: 'existing_other_state', label: 'Incorporated in another state' },
        ]} />
      </Field>

      {o.status && o.status !== 'new' && (
        <div className="card mb-4 bg-gray-50">
          <p className="text-xs font-medium text-gray-600 mb-3">About the existing organization</p>
          <div className="grid grid-cols-2 gap-x-3">
            <Field label="State of incorporation" error={err('/organization/existing/state')}>
              <TextInput value={ex.state} onChange={v => set(['organization', 'existing', 'state'], v.toUpperCase().slice(0, 2))} placeholder="FL" error={err('/organization/existing/state')} />
            </Field>
            <Field label="Date incorporated" error={err('/organization/existing/incorporation_date')}>
              <TextInput type="date" value={ex.incorporation_date} onChange={v => set(['organization', 'existing', 'incorporation_date'], v)} error={err('/organization/existing/incorporation_date')} />
            </Field>
          </div>
          <Field label="State entity / document number" error={err('/organization/existing/entity_id')}>
            <TextInput value={ex.entity_id} onChange={v => set(['organization', 'existing', 'entity_id'], v)} placeholder="e.g. N19000001234" error={err('/organization/existing/entity_id')} />
          </Field>
          <Field label="EIN (if issued)" hint="Format 12-3456789. Leave blank if none has been issued." error={err('/organization/existing/ein')}>
            <Unknowable value={ex.ein} onChange={v => set(['organization', 'existing', 'ein'], v)}>
              <TextInput value={ex.ein} onChange={v => set(['organization', 'existing', 'ein'], v)} placeholder="12-3456789" error={err('/organization/existing/ein')} />
            </Unknowable>
          </Field>
          <Field label="IRS tax-exempt status so far" error={err('/organization/existing/prior_irs_status')}>
            <Unknowable value={ex.prior_irs_status} onChange={v => set(['organization', 'existing', 'prior_irs_status'], v)}>
              <Select value={ex.prior_irs_status} onChange={v => set(['organization', 'existing', 'prior_irs_status'], v)} options={[
                { value: 'none', label: 'Never applied' }, { value: 'pending', label: 'Application pending' },
                { value: 'exempt', label: 'Already exempt' }, { value: 'denied', label: 'Applied and denied' },
                { value: 'revoked', label: 'Exemption was revoked' },
              ]} />
            </Unknowable>
          </Field>
          <Field label="Revocation or reinstatement history (if any)">
            <TextArea value={ex.revocation_history} onChange={v => set(['organization', 'existing', 'revocation_history'], v)} />
          </Field>
        </div>
      )}

      <Field label="Proposed name(s), in order of preference" hint="Up to three. We check availability with the Florida Division of Corporations; availability isn't guaranteed." error={err('/organization/names')}>
        <div className="space-y-2">
          {names.map((n, i) => (
            <div key={i} className="flex gap-2">
              <TextInput value={n} onChange={v => set(['organization', 'names', i], v)} placeholder={`Choice ${i + 1}`} error={err(`/organization/names/${i}`)} />
              {names.length > 1 && (
                <button type="button" className="btn-ghost" onClick={() => set(['organization', 'names'], names.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
              )}
            </div>
          ))}
          {names.length < 3 && (
            <button type="button" className="btn-ghost text-xs" onClick={() => set(['organization', 'names'], [...names, ''])}><Plus size={12} className="inline" /> Add another name</button>
          )}
        </div>
      </Field>

      <Field label="Principal office address" hint="A physical address, not a PO box.">
        <AddressFields value={o.principal_address} onChange={v => set(['organization', 'principal_address'], v)} errorAt={err} path="/organization/principal_address" />
      </Field>
      <Field label="Mailing address (if different)">
        <AddressFields value={o.mailing_address} onChange={v => set(['organization', 'mailing_address'], v)} errorAt={err} path="/organization/mailing_address" />
      </Field>
      <Field label="Mission" hint="What the organization will do and why. 20 to 1,000 characters." error={err('/organization/mission')}>
        <TextArea value={o.mission} onChange={v => set(['organization', 'mission'], v)} maxLength={1000} error={err('/organization/mission')} />
      </Field>
      <Field label="Main exempt purpose" error={err('/organization/exempt_purpose')}>
        <Select value={o.exempt_purpose} onChange={v => set(['organization', 'exempt_purpose'], v)} options={PURPOSES} />
      </Field>
      <Field label="Who will benefit?" hint="Describe the people or community served. At least 20 characters." error={err('/organization/beneficiaries')}>
        <TextArea value={o.beneficiaries} onChange={v => set(['organization', 'beneficiaries'], v)} error={err('/organization/beneficiaries')} />
      </Field>
      <Field label="Where will it operate?" error={err('/organization/geography')}>
        <MultiCheck value={o.geography} onChange={v => set(['organization', 'geography'], v)} options={[
          { value: 'florida', label: 'Florida' }, { value: 'other_us_states', label: 'Other US states' }, { value: 'outside_us', label: 'Outside the US' },
        ]} />
      </Field>
    </>
  )
}

// ─── 3. Activities ──────────────────────────
const blankActivity = { name: '', description: '', beneficiaries: '', location: '', mission_connection: '' }

export function ActivitiesStep({ a, set, err }: StepProps) {
  const list: any[] = a.activities?.length ? a.activities : [blankActivity]
  const total = list.reduce((s, x) => s + (typeof x.percent_resources === 'number' ? x.percent_resources : 0), 0)
  const at = (i: number, k: string, v: unknown) => set(['activities', i, k], v)
  return (
    <>
      <p className="text-sm text-gray-500 mb-4">List each program or activity. Together they should account for all of the organization&apos;s time and money.</p>
      {err('/activities') && <p className="text-xs text-red-600 mb-3">{err('/activities')}</p>}
      {list.map((act, i) => (
        <div key={i} className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Activity {i + 1}</p>
            {list.length > 1 && <button type="button" className="btn-ghost" onClick={() => set(['activities'], list.filter((_, j) => j !== i))}><Trash2 size={14} /></button>}
          </div>
          <Field label="Name" error={err(`/activities/${i}/name`)}><TextInput value={act.name} onChange={v => at(i, 'name', v)} error={err(`/activities/${i}/name`)} /></Field>
          <Field label="What happens" hint="At least 20 characters." error={err(`/activities/${i}/description`)}><TextArea value={act.description} onChange={v => at(i, 'description', v)} error={err(`/activities/${i}/description`)} /></Field>
          <div className="grid grid-cols-2 gap-x-3">
            <Field label="Who it serves" error={err(`/activities/${i}/beneficiaries`)}><TextInput value={act.beneficiaries} onChange={v => at(i, 'beneficiaries', v)} error={err(`/activities/${i}/beneficiaries`)} /></Field>
            <Field label="Where" error={err(`/activities/${i}/location`)}><TextInput value={act.location} onChange={v => at(i, 'location', v)} error={err(`/activities/${i}/location`)} /></Field>
          </div>
          <Field label="How it furthers the mission" error={err(`/activities/${i}/mission_connection`)}><TextInput value={act.mission_connection} onChange={v => at(i, 'mission_connection', v)} error={err(`/activities/${i}/mission_connection`)} /></Field>
          <Field label="Share of total resources (%)" error={err(`/activities/${i}/percent_resources`)}>
            <input type="number" min={0} max={100} className="input w-28" value={act.percent_resources ?? ''} onChange={e => at(i, 'percent_resources', e.target.value === '' ? undefined : Number(e.target.value))} />
          </Field>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button type="button" className="btn-secondary text-xs" onClick={() => set(['activities'], [...list, { ...blankActivity }])}><Plus size={12} className="inline" /> Add activity</button>
        <span className={total === 100 ? 'text-xs text-green-700' : 'text-xs text-amber-700'}>Total: {total}% {total !== 100 && '(must be 100%)'}</span>
      </div>
    </>
  )
}

// ─── 4. Board & officers ────────────────────
const newDirectorId = () => `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function GovernanceStep({ a, set, err }: StepProps) {
  const g = a.governance ?? {}
  const directors: any[] = g.directors?.length ? g.directors : [{ id: newDirectorId() }]
  const officers: any[] = g.officers?.length ? g.officers : [{}]
  const dset = (i: number, k: string, v: unknown) => {
    if (!g.directors?.length) set(['governance', 'directors'], directors)
    set(['governance', 'directors', i, k], v)
  }
  return (
    <>
      <h3 className="text-sm font-semibold text-gray-800 mb-1">Board of directors</h3>
      <p className="text-xs text-gray-500 mb-3">The IRS expects at least three unrelated directors; fewer is allowed but will be reviewed.</p>
      {err('/governance/directors') && <p className="text-xs text-red-600 mb-3">{err('/governance/directors')}</p>}
      {directors.map((d, i) => (
        <div key={d.id ?? i} className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Director {i + 1}</p>
            {directors.length > 1 && <button type="button" className="btn-ghost" onClick={() => set(['governance', 'directors'], directors.filter((_, j) => j !== i))}><Trash2 size={14} /></button>}
          </div>
          <div className="grid grid-cols-2 gap-x-3">
            <Field label="Full name" error={err(`/governance/directors/${i}/name`)}><TextInput value={d.name} onChange={v => dset(i, 'name', v)} error={err(`/governance/directors/${i}/name`)} /></Field>
            <Field label="Email" error={err(`/governance/directors/${i}/email`)}><TextInput type="email" value={d.email} onChange={v => dset(i, 'email', v)} error={err(`/governance/directors/${i}/email`)} /></Field>
          </div>
          <Field label="Board role" hint="e.g. Chair, Member" error={err(`/governance/directors/${i}/role`)}><TextInput value={d.role} onChange={v => dset(i, 'role', v)} error={err(`/governance/directors/${i}/role`)} /></Field>
          <Field label="Mailing address"><AddressFields value={d.address} onChange={v => dset(i, 'address', v)} errorAt={err} path={`/governance/directors/${i}/address`} /></Field>
          <Field label="Family or business relationships with other directors, officers or donors" hint='Write "None" if there are none.' error={err(`/governance/directors/${i}/relationships`)}>
            <TextInput value={d.relationships} onChange={v => dset(i, 'relationships', v)} error={err(`/governance/directors/${i}/relationships`)} />
          </Field>
          <Field label="Will this director be paid?" error={err(`/governance/directors/${i}/compensated`)}>
            <Choice value={d.compensated} onChange={v => dset(i, 'compensated', v)} options={YES_NO} />
          </Field>
          {d.compensated === true && (
            <Field label="Expected yearly pay" error={err(`/governance/directors/${i}/compensation_amount`)}>
              <Unknowable value={d.compensation_amount} onChange={v => dset(i, 'compensation_amount', v)}>
                <MoneyInput value={d.compensation_amount} onChange={v => dset(i, 'compensation_amount', v)} error={err(`/governance/directors/${i}/compensation_amount`)} />
              </Unknowable>
            </Field>
          )}
        </div>
      ))}
      <button type="button" className="btn-secondary text-xs mb-6" onClick={() => set(['governance', 'directors'], [...directors, { id: newDirectorId() }])}><Plus size={12} className="inline" /> Add director</button>

      <h3 className="text-sm font-semibold text-gray-800 mb-3">Officers</h3>
      {officers.map((o, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-start">
          <div className="col-span-6 sm:col-span-4"><TextInput value={o.name} onChange={v => set(['governance', 'officers', i, 'name'], v)} placeholder="Name" error={err(`/governance/officers/${i}/name`)} /></div>
          <div className="col-span-6 sm:col-span-3"><TextInput value={o.title} onChange={v => set(['governance', 'officers', i, 'title'], v)} placeholder="Title" error={err(`/governance/officers/${i}/title`)} /></div>
          <div className="col-span-10 sm:col-span-4">
            <Select value={o.director_id} placeholder="Not a director" onChange={v => {
              set(['governance', 'officers', i, 'director_id'], v)
              const d = directors.find(x => x.id === v)
              if (d?.name && !o.name) set(['governance', 'officers', i, 'name'], d.name)
            }} options={directors.filter(d => d.id).map(d => ({ value: d.id as string, label: `Also director: ${d.name || 'unnamed'}` }))} />
          </div>
          <div className="col-span-2 sm:col-span-1">{officers.length > 1 && <button type="button" className="btn-ghost" onClick={() => set(['governance', 'officers'], officers.filter((_, j) => j !== i))}><Trash2 size={14} /></button>}</div>
        </div>
      ))}
      {err('/governance/officers') && <p className="text-xs text-red-600 mb-2">{err('/governance/officers')}</p>}
      <button type="button" className="btn-secondary text-xs mb-6" onClick={() => set(['governance', 'officers'], [...officers, {}])}><Plus size={12} className="inline" /> Add officer</button>

      <Field label="Will the organization have voting members?" hint="Members who elect directors or approve major decisions." error={err('/governance/voting_members')}>
        <Choice value={g.voting_members} onChange={v => set(['governance', 'voting_members'], v)} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }, { value: 'unsure', label: 'Not sure' }]} />
      </Field>
      <Field label="Who chooses future directors?" error={err('/governance/director_selection')}>
        <Choice value={g.director_selection} onChange={v => set(['governance', 'director_selection'], v)} options={[
          { value: 'board', label: 'The board' }, { value: 'members', label: 'The members' }, { value: 'founder', label: 'The founder' }, { value: 'other', label: 'Other' },
        ]} />
      </Field>
    </>
  )
}

// ─── 5. Registered agent ────────────────────
export function AgentStep({ a, set, err }: StepProps) {
  const ag = a.agent ?? {}
  return (
    <>
      <p className="text-sm text-gray-500 mb-4">Florida requires a registered agent with a Florida street address to receive legal papers.</p>
      <Field label="Who will be the registered agent?" error={err('/agent/kind')}>
        <Choice value={ag.kind} onChange={v => set(['agent', 'kind'], v)} options={[
          { value: 'individual', label: 'A person' }, { value: 'company', label: 'A registered agent company' }, { value: 'need_service', label: 'I need one' },
        ]} />
      </Field>
      {ag.kind && ag.kind !== 'need_service' && (
        <>
          <Field label="Agent name" error={err('/agent/name')}><TextInput value={ag.name} onChange={v => set(['agent', 'name'], v)} error={err('/agent/name')} /></Field>
          <Field label="Agent's Florida street address" hint="Must be in Florida. PO boxes are not accepted.">
            <AddressFields value={ag.florida_street_address} onChange={v => set(['agent', 'florida_street_address'], v)} errorAt={err} path="/agent/florida_street_address" fixedState="FL" />
          </Field>
          <Field label="Has the agent agreed to serve?" error={err('/agent/accepted')}>
            <Unknowable value={ag.accepted} onChange={v => set(['agent', 'accepted'], v)}>
              <Choice value={ag.accepted} onChange={v => set(['agent', 'accepted'], v)} options={YES_NO} />
            </Unknowable>
            {ag.accepted !== true && ag.accepted !== undefined && <p className="text-xs text-amber-700 mt-2">Florida won&apos;t accept the filing until the agent has agreed in writing.</p>}
          </Field>
        </>
      )}
      {ag.kind === 'need_service' && <p className="text-sm text-gray-600">We&apos;ll arrange a registered agent and include their details in your filing.</p>}
    </>
  )
}

// ─── 6. Finances ────────────────────────────
const RECEIPTS = [['donations', 'Donations'], ['grants', 'Grants'], ['program_fees', 'Program fees'], ['membership_dues', 'Membership dues'], ['sales', 'Sales'], ['government', 'Government funding'], ['investment', 'Investment income'], ['other', 'Other income']]
const EXPENSES = [['program', 'Program costs'], ['salaries', 'Salaries & pay'], ['rent', 'Rent & occupancy'], ['fundraising', 'Fundraising'], ['management', 'Admin & management'], ['other', 'Other expenses']]

function FinanceTable({ years, rows, onChange, err, path }: {
  years: number[]; rows: any[]; onChange: (rows: any[]) => void; err: StepProps['err']; path: string
}) {
  const cell = (year: number, kind: 'receipts' | 'expenses', key: string) => rows.find(r => r?.year === year)?.[kind]?.[key]
  const setCell = (year: number, kind: 'receipts' | 'expenses', key: string, v: number | undefined) => {
    const next = years.map(y => {
      const row = rows.find(r => r?.year === y) ?? { year: y, receipts: {}, expenses: {} }
      if (y !== year) return row
      const part = { ...(row[kind] ?? {}) }
      if (v === undefined) delete part[key]; else part[key] = v
      return { ...row, [kind]: part }
    })
    onChange(next)
  }
  const total = (year: number, kind: 'receipts' | 'expenses') => Object.values(rows.find(r => r?.year === year)?.[kind] ?? {}).reduce((s: number, v: any) => s + (Number(v) || 0), 0)
  const section = (kind: 'receipts' | 'expenses', list: string[][]) => (
    <>
      <tr><td colSpan={years.length + 1} className="pt-3 pb-1 text-xs font-semibold text-gray-600">{kind === 'receipts' ? 'Money coming in' : 'Money going out'}</td></tr>
      {list.map(([key, label]) => (
        <tr key={key}>
          <td className="pr-2 text-xs text-gray-600 py-1">{label}</td>
          {years.map(y => (
            <td key={y} className="px-1 py-1">
              <input type="number" min={0} step="any" className="input py-1 text-right" value={cell(y, kind, key) ?? ''}
                onChange={e => setCell(y, kind, key, e.target.value === '' ? undefined : Number(e.target.value))} />
            </td>
          ))}
        </tr>
      ))}
      <tr>
        <td className="pr-2 text-xs font-medium text-gray-700 py-1">Total</td>
        {years.map(y => <td key={y} className="px-1 text-right text-xs font-medium text-gray-700">${total(y, kind).toLocaleString()}</td>)}
      </tr>
    </>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px]">
        <thead><tr><th />{years.map(y => <th key={y} className="text-xs text-gray-500 font-medium px-1 text-right">{y}</th>)}</tr></thead>
        <tbody>{section('receipts', RECEIPTS)}{section('expenses', EXPENSES)}</tbody>
      </table>
      {err(path) && <p className="text-xs text-red-600 mt-1">{err(path)}</p>}
    </div>
  )
}

export function FinanceStep({ a, set, err }: StepProps) {
  const f = a.finance ?? {}
  const projections: any[] = f.projections ?? []
  const firstYear: number = projections[0]?.year ?? new Date().getFullYear() + 1
  const years = [firstYear, firstYear + 1, firstYear + 2]
  const pastYears = [firstYear - 3, firstYear - 2, firstYear - 1]
  const existing = a.organization?.status && a.organization.status !== 'new'
  const basis = f.public_charity_basis
  return (
    <>
      <Field label="Fiscal year ends on" hint="Most organizations use December 31." error={err('/finance/fiscal_year_end')}>
        <Select value={f.fiscal_year_end} onChange={v => set(['finance', 'fiscal_year_end'], v)} options={[
          ['12-31', 'December 31'], ['03-31', 'March 31'], ['06-30', 'June 30'], ['09-30', 'September 30'],
        ].map(([value, label]) => ({ value, label }))} />
      </Field>
      <Field label="First year of projections" hint="Projections cover three consecutive years.">
        <input type="number" className="input w-28" value={firstYear} onChange={e => {
          const y = Number(e.target.value)
          if (!Number.isInteger(y)) return
          set(['finance', 'projections'], [y, y + 1, y + 2].map((yy, i) => ({ ...(projections[i] ?? { receipts: {}, expenses: {} }), year: yy })))
        }} />
      </Field>
      <h3 className="text-sm font-semibold text-gray-800 mb-1">Three-year budget</h3>
      <FinanceTable years={years} rows={projections} onChange={rows => set(['finance', 'projections'], rows)} err={err} path="/finance/projections" />

      {existing && (
        <>
          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-1">Past results (if any)</h3>
          <FinanceTable years={pastYears} rows={f.actual_years ?? []}
            onChange={rows => set(['finance', 'actual_years'], rows.filter(r => Object.keys(r.receipts ?? {}).length || Object.keys(r.expenses ?? {}).length))}
            err={err} path="/finance/actual_years" />
        </>
      )}

      <div className="mt-6">
        <Field label="Total value of everything the organization owns" hint="Include cash, equipment, property and other non-cash assets, at fair market value." error={err('/finance/asset_fmv')}>
          <Unknowable value={f.asset_fmv} onChange={v => set(['finance', 'asset_fmv'], v)}>
            <MoneyInput value={f.asset_fmv} onChange={v => set(['finance', 'asset_fmv'], v)} error={err('/finance/asset_fmv')} />
          </Unknowable>
        </Field>
        <Field label="Where will funding come from?" error={err('/finance/funding_sources')}>
          <MultiCheck value={f.funding_sources} onChange={v => set(['finance', 'funding_sources'], v)} options={[
            { value: 'donations', label: 'Donations' }, { value: 'grants', label: 'Grants' }, { value: 'fees', label: 'Program fees' },
            { value: 'dues', label: 'Membership dues' }, { value: 'sales', label: 'Sales' }, { value: 'government', label: 'Government funding' }, { value: 'other', label: 'Other' },
          ]} />
        </Field>
        <Field label="How will the organization be supported?" hint="This helps decide whether it qualifies as a public charity." error={err('/finance/public_charity_basis')}>
          <Unknowable value={basis} onChange={v => set(['finance', 'public_charity_basis'], v)}>
            <div className="space-y-2">
              <TextArea value={basis?.support_sources} onChange={v => set(['finance', 'public_charity_basis', 'support_sources'], v)} placeholder="Main sources of support (e.g. many small donors, a few foundations, one founder)" />
              <Select value={basis?.largest_donor_share} placeholder="Share from the single largest donor…" onChange={v => set(['finance', 'public_charity_basis', 'largest_donor_share'], v)} options={[
                { value: 'under_2', label: 'Under 2%' }, { value: '2_to_10', label: '2% to 10%' }, { value: 'over_10', label: 'Over 10%' }, { value: 'unknown', label: "Don't know yet" },
              ]} />
              <Select value={basis?.program_fee_share} placeholder="Share of income from program fees…" onChange={v => set(['finance', 'public_charity_basis', 'program_fee_share'], v)} options={[
                { value: 'none', label: 'None' }, { value: 'under_third', label: 'Under a third' }, { value: 'over_third', label: 'A third or more' }, { value: 'unknown', label: "Don't know yet" },
              ]} />
              <TextInput value={basis?.affiliations} onChange={v => set(['finance', 'public_charity_basis', 'affiliations'], v)} placeholder="Affiliations with other organizations (optional)" />
            </div>
          </Unknowable>
        </Field>
      </div>
    </>
  )
}

// ─── 7. Fundraising ─────────────────────────
export function FundraisingStep({ a, set, err }: StepProps) {
  const fr = a.fundraising ?? {}
  const methods = Object.keys(fr.methods ?? {})
  return (
    <>
      <Field label="Will the organization ask the public in Florida for donations?" hint="Florida requires most charities to register before soliciting." error={err('/fundraising/florida_solicitation')}>
        <Choice value={fr.florida_solicitation} onChange={v => set(['fundraising', 'florida_solicitation'], v)} options={YES_NO} />
      </Field>
      {fr.florida_solicitation === true && (
        <>
          <Field label="Contributions received so far" error={err('/fundraising/prior_contributions')}>
            <Unknowable value={fr.prior_contributions} onChange={v => set(['fundraising', 'prior_contributions'], v)}>
              <MoneyInput value={fr.prior_contributions} onChange={v => set(['fundraising', 'prior_contributions'], v)} />
            </Unknowable>
          </Field>
          <Field label="How will you raise money?" error={err('/fundraising/methods')}>
            <MultiCheck value={methods} onChange={v => set(['fundraising', 'methods'], Object.fromEntries(v.map(k => [k, true])))} options={[
              { value: 'online', label: 'Online / website' }, { value: 'mail', label: 'Mail' }, { value: 'phone', label: 'Phone' },
              { value: 'events', label: 'Events' }, { value: 'in_person', label: 'In person / door to door' }, { value: 'grant_applications', label: 'Grant applications' }, { value: 'other', label: 'Other' },
            ]} />
          </Field>
          <Field label="Will anyone be paid to raise money?" error={err('/fundraising/paid_personnel')}>
            <Unknowable value={fr.paid_personnel} onChange={v => set(['fundraising', 'paid_personnel'], v)}>
              <Choice value={fr.paid_personnel} onChange={v => set(['fundraising', 'paid_personnel'], v)} options={YES_NO} />
            </Unknowable>
          </Field>
          <Field label="Will you hire a professional fundraiser or solicitor?" error={err('/fundraising/professional_fundraiser')}>
            <Unknowable value={fr.professional_fundraiser} onChange={v => set(['fundraising', 'professional_fundraiser'], v)}>
              <Choice value={fr.professional_fundraiser} onChange={v => set(['fundraising', 'professional_fundraiser'], v)} options={YES_NO} />
            </Unknowable>
          </Field>
        </>
      )}
    </>
  )
}

// ─── 8. Special screening ───────────────────
export const FLAG_LABELS: Record<string, string> = {
  scholarships: 'Scholarships or educational grants to individuals', individual_grants: 'Other grants or aid to individuals',
  organization_grants: 'Grants to other organizations', foreign_operations: 'Operating outside the US', foreign_grants: 'Grants to foreign organizations or people',
  school: 'Operating a school', hospital: 'Operating a hospital or medical care', church: 'A church or religious congregation',
  lobbying: 'Lobbying or trying to influence legislation', campaign_activity: 'Supporting or opposing political candidates',
  substantial_sales: 'Selling goods or services as a major activity', gaming: 'Bingo, raffles or other gaming', loans: 'Making loans',
  founder_compensation: 'Paying founders or their family', related_party_transactions: 'Buying, selling or leasing with insiders or their businesses',
  supporting_organization: 'Supporting another specific charity', donor_advised_funds: 'Donor-advised funds',
  credit_counseling: 'Credit counseling', disaster_relief: 'Disaster relief', prior_revocation: 'A previous exemption was revoked',
  successor_entity: 'Taking over another organization', private_foundation_intent: 'Intending to be a private foundation',
}

export function ScreenStep({ a, set, err }: StepProps) {
  const s = a.screen ?? {}
  const flags: string[] = s.flags ?? []
  return (
    <>
      <p className="text-sm text-gray-500 mb-4">Tick anything the organization does or plans to do. These need extra review, so please explain each one you tick. If none apply, leave them all unticked.</p>
      <MultiCheck value={flags} onChange={v => set(['screen', 'flags'], v)} options={Object.entries(FLAG_LABELS).map(([value, label]) => ({ value, label }))} />
      {flags.includes('campaign_activity') && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          A 501(c)(3) cannot support or oppose candidates for public office. A reviewer will contact you before this intake can go further.
        </div>
      )}
      {flags.length > 0 && <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-3">Please explain</h3>}
      {flags.map(f => (
        <Field key={f} label={FLAG_LABELS[f]} hint="At least 10 characters." error={err(`/screen/details/${f}`)}>
          <TextArea value={s.details?.[f]} onChange={v => set(['screen', 'details', f], v)} error={err(`/screen/details/${f}`)} />
        </Field>
      ))}
    </>
  )
}

// ─── 9. Review & consent ────────────────────
export function ConsentStep({ a, set, err }: StepProps) {
  return (
    <Field label="Consent" error={err('/consent/prepare')}>
      <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" className="mt-0.5 accent-brand-500" checked={a.consent?.prepare === true} onChange={e => set(['consent', 'prepare'], e.target.checked)} />
        <span>I authorize eGrowth Legal to prepare draft formation and tax-exemption documents from these answers. Nothing will be filed or signed without my separate review and approval of each filing.</span>
      </label>
    </Field>
  )
}
