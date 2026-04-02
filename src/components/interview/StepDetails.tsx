'use client'
import { InterviewAnswers, ServiceType } from '@/lib/types'

interface Props {
  answers: InterviewAnswers
  onChange: (a: Partial<InterviewAnswers>) => void
  onNext: () => void
  onBack: () => void
}

export default function StepDetails({ answers, onChange, onNext, onBack }: Props) {
  const service = answers.service_type ?? 'trust_estate'

  return (
    <div className="card">
      <h2 className="text-base font-medium mb-1">Document Details</h2>
      <p className="text-sm text-gray-500 mb-5">
        These answers will auto-populate the generated documents.
      </p>

      {service === 'trust_estate' && <TrustEstateFields answers={answers} onChange={onChange} />}
      {service === 'for_profit'   && <ForProfitFields   answers={answers} onChange={onChange} />}
      {service === 'nonprofit'    && <NonprofitFields   answers={answers} onChange={onChange} />}
      {service === 'trustee_service' && <TrusteeServiceFields answers={answers} onChange={onChange} />}

      {/* Shared: Trustee service upsell */}
      {service !== 'trustee_service' && (
        <div className="mt-4 p-3 bg-brand-50 border border-brand-200 rounded-lg">
          <label className="label text-brand-700">Add eGrowth as Co-Trustee / File Custodian?</label>
          <select
            value={answers.use_egrowth_trustee ? 'yes' : 'no'}
            onChange={e => onChange({ use_egrowth_trustee: e.target.value === 'yes' })}
            className="input mt-1"
          >
            <option value="no">No — client retains full control</option>
            <option value="yes">Yes — eGrowth Trustee File Custody Service (+$500/yr)</option>
          </select>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-gray-100 mt-5">
        <button onClick={onBack} className="btn-secondary">← Back</button>
        <button onClick={onNext} className="btn-primary">Continue →</button>
      </div>
    </div>
  )
}

// ─── Trust & Estate ───────────────────────
function TrustEstateFields({ answers, onChange }: { answers: InterviewAnswers; onChange: (a: Partial<InterviewAnswers>) => void }) {
  return (
    <>
      <div className="mb-3">
        <label className="label">Type of Trust</label>
        <select value={answers.trust_type ?? ''} onChange={e => onChange({ trust_type: e.target.value })} className="input">
          <option value="">Select trust type...</option>
          <option>Revocable Living Trust</option>
          <option>Irrevocable Trust</option>
          <option>Land Trust</option>
          <option>Special Needs Trust</option>
          <option>Testamentary Trust</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="label">Trust Name</label>
        <input
          value={answers.trust_name ?? ''}
          onChange={e => onChange({ trust_name: e.target.value })}
          placeholder="The Johnson Family Living Trust"
          className="input"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">Successor Trustee (Full Name)</label>
          <input
            value={answers.successor_trustee_name ?? ''}
            onChange={e => onChange({ successor_trustee_name: e.target.value })}
            placeholder="Full legal name"
            className="input"
          />
        </div>
        <div>
          <label className="label">Relationship to Grantor</label>
          <input
            value={answers.successor_trustee_relation ?? ''}
            onChange={e => onChange({ successor_trustee_relation: e.target.value })}
            placeholder="e.g. Spouse, Child, Attorney"
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="label">Beneficiaries (names + relationship)</label>
        <textarea
          value={answers.beneficiaries ?? ''}
          onChange={e => onChange({ beneficiaries: e.target.value })}
          placeholder="List all beneficiaries with full names and their relationship to the grantor..."
          className="input min-h-[90px] resize-y"
        />
      </div>
    </>
  )
}

// ─── For-Profit ───────────────────────────
function ForProfitFields({ answers, onChange }: { answers: InterviewAnswers; onChange: (a: Partial<InterviewAnswers>) => void }) {
  return (
    <>
      <div className="mb-3">
        <label className="label">Entity Type</label>
        <select value={answers.entity_type ?? ''} onChange={e => onChange({ entity_type: e.target.value })} className="input">
          <option value="">Select entity type...</option>
          <option>LLC (Single-Member)</option>
          <option>LLC (Multi-Member)</option>
          <option>S-Corporation</option>
          <option>C-Corporation</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="label">Entity Name</label>
        <input
          value={answers.entity_name ?? ''}
          onChange={e => onChange({ entity_name: e.target.value })}
          placeholder="Johnson Holdings LLC"
          className="input"
        />
      </div>
      <div className="mb-3">
        <label className="label">Registered Agent (Name or Company)</label>
        <input
          value={answers.registered_agent ?? ''}
          onChange={e => onChange({ registered_agent: e.target.value })}
          placeholder="Full name or registered agent company"
          className="input"
        />
      </div>
      <div className="mb-3">
        <label className="label">Members / Shareholders</label>
        <textarea
          value={answers.members ?? ''}
          onChange={e => onChange({ members: e.target.value })}
          placeholder="List each member with name, ownership %, and role..."
          className="input min-h-[80px] resize-y"
        />
      </div>
      <div>
        <label className="label">Business Purpose</label>
        <textarea
          value={answers.purpose ?? ''}
          onChange={e => onChange({ purpose: e.target.value })}
          placeholder="Describe the primary business purpose..."
          className="input min-h-[60px] resize-y"
        />
      </div>
    </>
  )
}

// ─── Nonprofit ────────────────────────────
function NonprofitFields({ answers, onChange }: { answers: InterviewAnswers; onChange: (a: Partial<InterviewAnswers>) => void }) {
  return (
    <>
      <div className="mb-3">
        <label className="label">Organization Name</label>
        <input
          value={answers.org_name ?? ''}
          onChange={e => onChange({ org_name: e.target.value })}
          placeholder="Official legal name of the organization"
          className="input"
        />
      </div>
      <div className="mb-3">
        <label className="label">Mission Statement</label>
        <textarea
          value={answers.mission_statement ?? ''}
          onChange={e => onChange({ mission_statement: e.target.value })}
          placeholder="Describe the organization's charitable purpose..."
          className="input min-h-[80px] resize-y"
        />
      </div>
      <div className="mb-3">
        <label className="label">Board Members (Name + Title)</label>
        <textarea
          value={answers.board_members ?? ''}
          onChange={e => onChange({ board_members: e.target.value })}
          placeholder="e.g. Robert Johnson — President&#10;Maria Torres — Secretary&#10;Kevin Williams — Treasurer"
          className="input min-h-[80px] resize-y"
        />
      </div>
      <div>
        <label className="label">Tax Year End</label>
        <select value={answers.tax_year ?? ''} onChange={e => onChange({ tax_year: e.target.value })} className="input">
          <option value="">Select fiscal year end...</option>
          <option value="12/31">December 31 (Calendar Year)</option>
          <option value="06/30">June 30</option>
          <option value="09/30">September 30</option>
        </select>
      </div>
    </>
  )
}

// ─── Trustee Service ─────────────────────
function TrusteeServiceFields({ answers, onChange }: { answers: InterviewAnswers; onChange: (a: Partial<InterviewAnswers>) => void }) {
  return (
    <>
      <div className="mb-3">
        <label className="label">Trust Name (for our records)</label>
        <input
          value={answers.trust_name ?? ''}
          onChange={e => onChange({ trust_name: e.target.value })}
          placeholder="The Johnson Family Living Trust"
          className="input"
        />
      </div>
      <div className="mb-3">
        <label className="label">Type of Trust</label>
        <select value={answers.trust_type ?? ''} onChange={e => onChange({ trust_type: e.target.value })} className="input">
          <option value="">Select trust type...</option>
          <option>Revocable Living Trust</option>
          <option>Irrevocable Trust</option>
          <option>Land Trust</option>
        </select>
      </div>
      <div>
        <label className="label">Special Instructions for File Custody</label>
        <textarea
          value={answers.special_instructions ?? ''}
          onChange={e => onChange({ special_instructions: e.target.value })}
          placeholder="Any special handling instructions, contacts to notify, or conditions for document release..."
          className="input min-h-[90px] resize-y"
        />
      </div>
    </>
  )
}
