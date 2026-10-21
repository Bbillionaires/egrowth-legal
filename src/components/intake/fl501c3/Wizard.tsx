'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Check, Loader2 } from 'lucide-react'
import { prepareForSave } from '@/lib/intake/fl501c3/payload'
import type { IntakePayload, Issue, Section } from '@/lib/intake/fl501c3/validate'
import {
  ActivitiesStep, AgentStep, ApplicantStep, ConsentStep, FinanceStep, FundraisingStep,
  GovernanceStep, OrganizationStep, ScreenStep, type Path, type StepProps,
} from './steps'

const STEPS: { title: string; sections: Section[]; Component: (p: StepProps) => JSX.Element }[] = [
  { title: 'Applicant', sections: ['applicant'], Component: ApplicantStep },
  { title: 'Organization', sections: ['organization'], Component: OrganizationStep },
  { title: 'Activities', sections: ['activities'], Component: ActivitiesStep },
  { title: 'Board', sections: ['governance'], Component: GovernanceStep },
  { title: 'Registered agent', sections: ['agent'], Component: AgentStep },
  { title: 'Finances', sections: ['finance'], Component: FinanceStep },
  { title: 'Fundraising', sections: ['fundraising'], Component: FundraisingStep },
  { title: 'Screening', sections: ['screen'], Component: ScreenStep },
  { title: 'Review', sections: ['consent'], Component: ConsentStep },
]
const ALL_SECTIONS = STEPS.flatMap(s => s.sections)

// Immutable set by path; creates arrays for numeric keys and objects otherwise
function setIn(node: any, [key, ...rest]: Path, value: unknown): any {
  const base = node && typeof node === 'object' ? node : (typeof key === 'number' ? [] : {})
  const copy = Array.isArray(base) ? [...base] : { ...base }
  ;(copy as any)[key] = rest.length ? setIn((base as any)[key], rest, value) : value
  return copy
}

interface SaveResponse {
  errors?: Issue[]
  warnings?: Issue[]
  error?: string
  status?: string
  step?: { complete: boolean; errors: Issue[]; warnings: Issue[] }
}

export default function Fl501c3Wizard({ interviewId, canEditSubmitted, onDone }: {
  interviewId: string
  // staff may keep editing after submission; clients may not
  canEditSubmitted: boolean
  onDone?: () => void
}) {
  const [payload, setPayload] = useState<IntakePayload | null>(null)
  const [status, setStatus] = useState<string>('in_progress')
  const [step, setStep] = useState(0)
  const [issues, setIssues] = useState<Issue[]>([])
  const [warnings, setWarnings] = useState<Issue[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [review, setReview] = useState<Record<number, boolean>>({})

  useEffect(() => {
    fetch(`/api/intake/fl501c3/${interviewId}`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Could not load the intake.')
        setPayload(data.payload)
        setStatus(data.status)
        setStep(Math.min(Math.max((data.current_step ?? 1) - 1, 0), STEPS.length - 1))
      })
      .catch(e => setLoadError(e.message))
  }, [interviewId])

  const set = useCallback((path: Path, value: unknown) => {
    setPayload(prev => prev && { ...prev, answers: setIn(prev.answers, path, value) })
    // An edited answer drops its stale errors (and those of anything nested under it)
    const pointer = '/' + path.join('/')
    setIssues(prev => prev.filter(i => i.path !== pointer && !i.path.startsWith(`${pointer}/`)))
  }, [])

  const errorMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const i of issues) if (!map[i.path]) map[i.path] = i.message
    return map
  }, [issues])
  const err = useCallback((pointer: string) => errorMap[pointer], [errorMap])

  async function save(action: 'save' | 'submit', sections?: Section[], nextStep?: number): Promise<SaveResponse | null> {
    if (!payload) return null
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/intake/fl501c3/${interviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload: prepareForSave(payload), sections, step: nextStep }),
      })
      const data: SaveResponse = await res.json()
      if (!res.ok) {
        setIssues(data.errors ?? [])
        setMessage(data.error ?? 'Some answers need attention before this can be saved.')
        return null
      }
      return data
    } catch {
      setMessage('Could not reach the server. Your answers on this screen are not saved yet.')
      return null
    } finally {
      setBusy(false)
    }
  }

  async function goNext() {
    const result = await save('save', STEPS[step].sections, step + 2)
    if (!result) return
    setWarnings(result.step?.warnings ?? [])
    if (result.step && !result.step.complete) {
      setIssues(result.step.errors)
      setMessage('Please complete the highlighted answers before continuing.')
      return
    }
    setIssues([])
    setStep(s => s + 1)
    window.scrollTo({ top: 0 })
  }

  async function goBack() {
    const result = await save('save', undefined, step)
    if (!result) return
    setIssues([])
    setWarnings([])
    setStep(s => s - 1)
  }

  // Saves once with every section checked, then marks each earlier step complete or not
  async function checkAll() {
    const result = await save('save', ALL_SECTIONS)
    const errors = result?.step?.errors ?? []
    setReview(Object.fromEntries(STEPS.slice(0, -1).map((s, i) => [
      i, !!result && !errors.some(e => s.sections.some(sec => e.path === `/${sec}` || e.path.startsWith(`/${sec}/`))),
    ])))
  }

  useEffect(() => {
    if (payload && step === STEPS.length - 1) checkAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, payload === null])

  async function submit() {
    if (payload?.answers.consent?.prepare !== true) {
      setIssues([{ path: '/consent/prepare', code: 'required', message: 'Please give consent to prepare the documents.' }])
      return
    }
    const result = await save('submit', ALL_SECTIONS)
    if (!result) {
      setMessage('Some answers still need attention. Check the steps marked below.')
      await checkAll()
      return
    }
    setStatus('completed')
    setIssues([])
    onDone?.()
  }

  if (loadError) return <div className="card text-sm text-red-700">{loadError}</div>
  if (!payload) return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Loading intake…</div>

  if (status === 'completed' && !canEditSubmitted) {
    return (
      <div className="card text-center py-10">
        <Check size={28} className="mx-auto text-brand-600 mb-2" />
        <p className="text-sm font-medium text-gray-900">Your intake has been submitted.</p>
        <p className="text-xs text-gray-500 mt-1">Our team will review it and contact you about next steps. Nothing will be filed without your approval.</p>
      </div>
    )
  }

  const { Component } = STEPS[step]
  const last = step === STEPS.length - 1
  // Missing answers are marked on their fields; list the other problems once each
  const screenErrors = Array.from(new Map(issues
    .filter(i => i.code !== 'required' && STEPS[step].sections.some(s => i.path === `/${s}` || i.path.startsWith(`/${s}/`)))
    .map(i => [i.message, i])).values())

  return (
    <div>
      {status === 'completed' && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
          This intake was submitted. You can still correct answers as staff; changes are validated before saving.
        </div>
      )}

      <ol className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex items-center gap-1.5">
            <span className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium',
              i < step ? 'bg-brand-500 text-white' : i === step ? 'border-2 border-brand-500 text-brand-600' : 'border border-gray-200 text-gray-400')}>
              {i < step ? <Check size={10} /> : i + 1}
            </span>
            <span className={clsx('text-xs', i === step ? 'font-medium text-gray-900' : 'text-gray-400')}>{s.title}</span>
          </li>
        ))}
      </ol>

      <h2 className="text-base font-semibold text-gray-900 mb-4">{STEPS[step].title}</h2>

      {message && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{message}</div>}
      {screenErrors.length > 0 && (
        <ul className="mb-4 text-xs text-red-600 list-disc pl-5">
          {screenErrors.slice(0, 5).map(i => <li key={i.path + i.code}>{i.message}</li>)}
        </ul>
      )}
      {warnings.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
          {warnings.map(w => <p key={w.path + w.code}>{w.message}</p>)}
        </div>
      )}

      {last && (
        <div className="card mb-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Before you submit</p>
          <ul className="space-y-1">
            {STEPS.slice(0, -1).map((s, i) => (
              <li key={s.title} className="flex items-center justify-between text-sm">
                <button type="button" className="text-left text-gray-700 hover:underline" onClick={() => { setIssues([]); setStep(i) }}>{s.title}</button>
                {review[i] === undefined ? <span className="text-xs text-gray-400">Checking…</span>
                  : review[i] ? <span className="badge badge-complete">Complete</span>
                  : <span className="badge badge-pending">Needs attention</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Component a={payload.answers} set={set} err={err} />

      <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
        <button type="button" className="btn-secondary" disabled={busy || step === 0} onClick={goBack}>Back</button>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost" disabled={busy} onClick={async () => { if (await save('save', undefined, step + 1)) setMessage(null) }}>
            Save draft
          </button>
          {last
            ? <button type="button" className="btn-primary" disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit intake'}</button>
            : <button type="button" className="btn-primary" disabled={busy} onClick={goNext}>{busy ? 'Saving…' : 'Next'}</button>}
        </div>
      </div>
    </div>
  )
}
