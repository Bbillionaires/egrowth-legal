'use client'
import { InterviewAnswers } from '@/lib/types'
import { AlertTriangle } from 'lucide-react'

interface Props {
  answers: InterviewAnswers
  onNext: () => Promise<void>
  onBack: () => void
}

const SERVICE_LABELS: Record<string, string> = {
  trust_estate:     'Trust & Estate Planning',
  for_profit:       'For-Profit Entity',
  nonprofit:        'Nonprofit Registration',
  trustee_service:  'Trustee Service',
}

export default function StepReview({ answers, onNext, onBack }: Props) {
  const rows: [string, string][] = [
    ['Service',       SERVICE_LABELS[answers.service_type ?? ''] ?? '—'],
    ['Client Name',   answers.full_name ?? '—'],
    ['Email',         answers.email ?? '—'],
    ['Phone',         answers.phone ?? '—'],
    ['State',         answers.state ?? '—'],
    ...(answers.trust_name    ? [['Trust Name',       answers.trust_name]    as [string,string]] : []),
    ...(answers.trust_type    ? [['Trust Type',       answers.trust_type]    as [string,string]] : []),
    ...(answers.entity_name   ? [['Entity Name',      answers.entity_name]   as [string,string]] : []),
    ...(answers.entity_type   ? [['Entity Type',      answers.entity_type]   as [string,string]] : []),
    ...(answers.org_name      ? [['Org Name',         answers.org_name]      as [string,string]] : []),
    ['Trustee Service', answers.use_egrowth_trustee ? 'Yes — eGrowth Co-Trustee' : 'No'],
  ]

  return (
    <div className="card">
      <h2 className="text-base font-medium mb-1">Review & Confirm</h2>
      <p className="text-sm text-gray-500 mb-5">Verify all details before generating the document package.</p>

      <div className="bg-gray-50 rounded-lg overflow-hidden mb-4">
        <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client Summary</p>
        </div>
        <div className="divide-y divide-gray-100">
          {rows.map(([key, val]) => (
            <div key={key} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-gray-500">{key}</span>
              <span className={`text-sm font-medium ${key === 'Trustee Service' && val.startsWith('Yes') ? 'text-brand-600' : ''}`}>
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-amber-600" />
        <p>
          <strong>Human handoff required.</strong> Documents will be generated and placed in the staff review queue.
          No automated submissions — a team member will manually file to protect against IP bans.
        </p>
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-100 mt-5">
        <button onClick={onBack} className="btn-secondary">← Back</button>
        <button onClick={onNext} className="btn-primary">Generate Documents →</button>
      </div>
    </div>
  )
}
