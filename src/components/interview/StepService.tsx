'use client'
import { InterviewAnswers, ServiceType } from '@/lib/types'
import { Scale, Building2, Heart, Shield } from 'lucide-react'
import clsx from 'clsx'

const SERVICES = [
  {
    type: 'trust_estate' as ServiceType,
    icon: Scale,
    title: 'Trust & Estate Planning',
    desc: 'Living trusts, wills, POA, healthcare directives',
  },
  {
    type: 'for_profit' as ServiceType,
    icon: Building2,
    title: 'For-Profit Entity',
    desc: 'LLC, S-Corp, Articles of Organization',
  },
  {
    type: 'nonprofit' as ServiceType,
    icon: Heart,
    title: 'Nonprofit Registration',
    desc: '501(c)(3), Articles of Incorporation, Bylaws',
  },
  {
    type: 'trustee_service' as ServiceType,
    icon: Shield,
    title: 'Trustee Service',
    desc: 'File custody & ongoing trustee management',
  },
]

interface Props {
  answers: InterviewAnswers
  onChange: (a: Partial<InterviewAnswers>) => void
  onNext: () => void
}

export default function StepService({ answers, onChange, onNext }: Props) {
  const selected = answers.service_type

  return (
    <div className="card">
      <h2 className="text-base font-medium mb-1">What does the client need?</h2>
      <p className="text-sm text-gray-500 mb-5">Select the primary service for this engagement.</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {SERVICES.map(s => (
          <button
            key={s.type}
            onClick={() => onChange({ service_type: s.type })}
            className={clsx(
              'text-left p-4 rounded-xl border transition-all',
              selected === s.type
                ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <s.icon size={20} className={selected === s.type ? 'text-brand-600' : 'text-gray-400'} />
            <p className="font-medium text-sm mt-2">{s.title}</p>
            <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
          </button>
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          onClick={onNext}
          disabled={!selected}
          className="btn-primary"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
