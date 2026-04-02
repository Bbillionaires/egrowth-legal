'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AlertCircle, Play, ChevronRight, X } from 'lucide-react'

// ─── Types ──────────────────────────────
interface SlideExplainer {
  title?: string
  body_text?: string
  video_url?: string
  video_thumbnail?: string
  is_enabled: boolean
}

interface Ad {
  id: string
  title: string
  image_url: string
  click_url: string
  placement: string
}

interface Slide {
  id: string
  section: string
  question: string
  subtext?: string
  type: 'text' | 'cards' | 'multi-cards' | 'textarea' | 'multi-input' | 'date'
  required: boolean
  options?: string[]
  inputs?: { id: string; placeholder: string; type?: string; width?: string }[]
  conditional?: { showIf: string; showInput: string; inputType?: 'text' | 'textarea' }
}

// ─── Will slides definition ──────────────
const WILL_SLIDES: Slide[] = [
  {
    id: 'full_name',
    section: 'Personal Information',
    question: 'What is your full legal name?',
    subtext: 'Enter your name exactly as it appears on your government-issued ID.',
    type: 'text',
    required: true,
  },
  {
    id: 'dob_address',
    section: 'Personal Information',
    question: 'What is your date of birth and current address?',
    subtext: 'This ensures your documents are legally accurate.',
    type: 'multi-input',
    required: true,
    inputs: [
      { id: 'dob', placeholder: 'Date of birth (MM/DD/YYYY)', type: 'text' },
      { id: 'address', placeholder: 'Street address' },
      { id: 'city', placeholder: 'City', width: 'flex-1' },
      { id: 'state', placeholder: 'State', width: 'w-20' },
      { id: 'zip', placeholder: 'ZIP', width: 'w-24' },
    ],
  },
  {
    id: 'aliases',
    section: 'Personal Information',
    question: 'Do you have any other names or aliases?',
    subtext: 'Include maiden names, legal nicknames, or names from a previous marriage.',
    type: 'cards',
    required: true,
    options: ['No, just one name', 'Yes, I have another name'],
    conditional: { showIf: 'Yes, I have another name', showInput: 'aliases_text' },
  },
  {
    id: 'marital_status',
    section: 'Personal Information',
    question: 'What is your current marital status?',
    type: 'cards',
    required: true,
    options: ['Single', 'Married', 'Divorced', 'Widowed'],
  },
  {
    id: 'children',
    section: 'Personal Information',
    question: 'Do you have children or dependents?',
    subtext: 'Include biological, adopted children, and anyone financially dependent on you.',
    type: 'cards',
    required: true,
    options: ['No', 'Yes'],
    conditional: { showIf: 'Yes', showInput: 'children_list', inputType: 'textarea' },
  },
  {
    id: 'executor',
    section: 'Executor',
    question: 'Who would you like as the executor of your will?',
    subtext: 'This person will manage your estate and carry out your final wishes.',
    type: 'multi-input',
    required: true,
    inputs: [
      { id: 'executor_name', placeholder: 'Full name of executor' },
      { id: 'executor_relation', placeholder: 'Relationship to you' },
      { id: 'executor_alt', placeholder: 'Alternate executor (optional)' },
    ],
  },
  {
    id: 'guardianship',
    section: 'Guardianship',
    question: 'If you have minor children, who should be their guardian?',
    subtext: 'This only applies if both parents pass away before the children turn 18.',
    type: 'multi-input',
    required: false,
    inputs: [
      { id: 'guardian_name', placeholder: 'Primary guardian full name' },
      { id: 'guardian_relation', placeholder: 'Relationship to you' },
      { id: 'guardian_alt', placeholder: 'Alternate guardian (optional)' },
    ],
  },
  {
    id: 'beneficiaries',
    section: 'Beneficiaries',
    question: 'Who are your primary beneficiaries?',
    subtext: 'List everyone who will receive a portion of your estate.',
    type: 'textarea',
    required: true,
  },
  {
    id: 'assets',
    section: 'Assets',
    question: 'What are your major assets?',
    subtext: 'Select all that apply — a general overview is fine for now.',
    type: 'multi-cards',
    required: true,
    options: ['Real estate', 'Bank accounts', 'Investments', 'Business interests', 'Vehicles', 'Digital assets / crypto', 'Jewelry / valuables', 'Life insurance'],
  },
  {
    id: 'bequests',
    section: 'Specific Bequests',
    question: 'Are there specific items you want to leave to specific people?',
    subtext: 'Heirlooms, jewelry, vehicles, charitable gifts with a specific recipient.',
    type: 'cards',
    required: true,
    options: ['No specific items', 'Yes, I have specific bequests'],
    conditional: { showIf: 'Yes, I have specific bequests', showInput: 'bequests_text', inputType: 'textarea' },
  },
  {
    id: 'debts',
    section: 'Debts',
    question: 'Do you have significant outstanding debts?',
    subtext: 'Mortgages, loans, or co-signed agreements to address in your will.',
    type: 'cards',
    required: true,
    options: ['No significant debts', 'Yes, I have debts to address'],
    conditional: { showIf: 'Yes, I have debts to address', showInput: 'debts_text', inputType: 'textarea' },
  },
  {
    id: 'funeral',
    section: 'Final Wishes',
    question: 'Do you have funeral or burial preferences?',
    subtext: 'Optional — gives your loved ones clear guidance.',
    type: 'cards',
    required: false,
    options: ['Traditional burial', 'Cremation', 'No preference'],
    conditional: { showIf: '*', showInput: 'funeral_notes', inputType: 'textarea' },
  },
  {
    id: 'special',
    section: 'Special Circumstances',
    question: 'Are there any special circumstances to consider?',
    subtext: 'Select all that apply.',
    type: 'multi-cards',
    required: false,
    options: ['Blended family / stepchildren', 'Beneficiary with special needs', 'I want to provide for pets', 'Estranged family member', 'None of these apply'],
  },
  {
    id: 'professionals',
    section: 'Professional Contacts',
    question: 'Do you have an estate planning attorney or financial advisor?',
    subtext: 'Optional — helps us coordinate with existing professionals.',
    type: 'cards',
    required: false,
    options: ['No professionals', 'Yes, I have professionals'],
    conditional: { showIf: 'Yes, I have professionals', showInput: 'professionals_list', inputType: 'textarea' },
  },
]

export default function WillInterview() {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [multiAnswers, setMultiAnswers] = useState<Record<string, string[]>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [explainers, setExplainers] = useState<Record<number, SlideExplainer>>({})
  const [ads, setAds] = useState<Ad[]>([])
  const [saving, setSaving] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [animating, setAnimating] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const total = WILL_SLIDES.length

  useEffect(() => {
    loadExplainersAndAds()
  }, [])

  async function loadExplainersAndAds() {
    const [{ data: expData }, { data: adData }] = await Promise.all([
      supabase.from('slide_explainers').select('*').eq('service_type', 'trust_estate').eq('is_enabled', true),
      supabase.from('ads').select('*').eq('is_active', true).order('priority'),
    ])
    if (expData) {
      const map: Record<number, SlideExplainer> = {}
      expData.forEach(e => { map[e.slide_index] = e })
      setExplainers(map)
    }
    if (adData) setAds(adData)
  }

  function validate(): boolean {
    const slide = WILL_SLIDES[current]
    if (!slide.required) return true

    const answer = answers[slide.id]
    const multiAns = multiAnswers[slide.id]

    if (slide.type === 'multi-cards') {
      if (!multiAns || multiAns.length === 0) {
        setErrors(prev => ({ ...prev, [slide.id]: 'Please select at least one option to continue.' }))
        return false
      }
    } else if (slide.type === 'cards') {
      if (!answer) {
        setErrors(prev => ({ ...prev, [slide.id]: 'Please select an option to continue.' }))
        return false
      }
    } else if (slide.type === 'multi-input') {
      const firstInput = slide.inputs?.[0]
      if (firstInput && !answers[firstInput.id]) {
        setErrors(prev => ({ ...prev, [slide.id]: 'Please fill in the required fields.' }))
        return false
      }
    } else {
      if (!answer || answer.trim() === '') {
        setErrors(prev => ({ ...prev, [slide.id]: 'This field is required.' }))
        return false
      }
    }
    return true
  }

  function navigate(dir: 'forward' | 'back') {
    if (dir === 'forward' && !validate()) return
    setErrors({})
    setDirection(dir)
    setAnimating(true)
    setTimeout(() => {
      setCurrent(c => dir === 'forward' ? Math.min(c + 1, total) : Math.max(c - 1, 0))
      setAnimating(false)
    }, 220)
  }

  function setAnswer(id: string, val: string) {
    setAnswers(prev => ({ ...prev, [id]: val }))
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  function toggleMulti(slideId: string, val: string) {
    setMultiAnswers(prev => {
      const cur = prev[slideId] ?? []
      const next = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val]
      return { ...prev, [slideId]: next }
    })
    setErrors(prev => { const n = { ...prev }; delete n[slideId]; return n })
  }

  async function handleSubmit() {
    setSaving(true)
    // Save to interviews table — to be wired to actual client session
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
    setCurrent(total)
  }

  const slide = current < total ? WILL_SLIDES[current] : null
  const explainer = current < total ? explainers[current] : null
  const slideAd = ads.find(a => a.placement === 'slide_bottom')
  const progress = Math.round((current / total) * 100)
  const isOptional = slide && !slide.required

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-8 px-4">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold">
            e<span className="text-brand-500">Growth</span> Legal
          </span>
          {current < total && (
            <span className="text-xs text-gray-400">{current + 1} of {total}</span>
          )}
        </div>

        {/* Progress */}
        {current < total && (
          <div className="h-1 bg-gray-100 rounded-full mb-8">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Slide card */}
        {current < total && slide && (
          <div
            className={`transition-all duration-200 ${
              animating
                ? direction === 'forward'
                  ? 'opacity-0 translate-x-4'
                  : 'opacity-0 -translate-x-4'
                : 'opacity-100 translate-x-0'
            }`}
          >
            {/* Ad — top slot (optional, only renders if ad exists with slide_top placement) */}
            {ads.find(a => a.placement === 'slide_top') && (
              <AdBanner ad={ads.find(a => a.placement === 'slide_top')!} />
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-4">
              {/* Section tag */}
              <p className="text-xs font-semibold tracking-widest text-brand-600 uppercase mb-3">
                {slide.section}
              </p>

              {/* Question */}
              <h1 className="text-2xl font-semibold text-gray-900 leading-snug mb-2">
                {slide.question}
              </h1>
              {slide.subtext && (
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">{slide.subtext}</p>
              )}

              {/* Explainer — only renders when enabled in admin */}
              {explainer && <ExplainerBlock explainer={explainer} />}

              {/* Answer input */}
              <SlideInput
                slide={slide}
                answers={answers}
                multiAnswers={multiAnswers}
                onAnswer={setAnswer}
                onMulti={toggleMulti}
              />

              {/* Error */}
              {errors[slide.id] && (
                <div className="flex items-center gap-2 mt-4 text-red-600 text-sm">
                  <AlertCircle size={14} />
                  {errors[slide.id]}
                </div>
              )}
            </div>

            {/* Ad — bottom slot */}
            {slideAd && <AdBanner ad={slideAd} />}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={() => navigate('back')}
                className={`text-sm text-gray-400 hover:text-gray-600 transition-colors ${current === 0 ? 'invisible' : ''}`}
              >
                ← Back
              </button>
              <div className="flex items-center gap-3">
                {isOptional && (
                  <button
                    onClick={() => navigate('forward')}
                    className="text-sm text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    Skip
                  </button>
                )}
                <button
                  onClick={current === total - 1 ? handleSubmit : () => navigate('forward')}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 px-6"
                >
                  {saving ? 'Saving...' : current === total - 1 ? 'Submit' : 'Continue'}
                  {!saving && <ChevronRight size={15} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete */}
        {current >= total && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a6b4a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">All done!</h2>
            <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto mb-8">
              Your answers have been saved. Our team will prepare your will documents and reach out within 2 business days.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => router.push('/client/documents')} className="btn-primary px-6">
                View my documents
              </button>
              <button onClick={() => router.push('/client/dashboard')} className="btn-secondary px-6">
                Back to dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────

function SlideInput({ slide, answers, multiAnswers, onAnswer, onMulti }: {
  slide: Slide
  answers: Record<string, string>
  multiAnswers: Record<string, string[]>
  onAnswer: (id: string, val: string) => void
  onMulti: (id: string, val: string) => void
}) {
  const showConditional = slide.conditional && (
    slide.conditional.showIf === '*' || answers[slide.id] === slide.conditional.showIf
  )

  if (slide.type === 'text') return (
    <div>
      <input
        type="text"
        className="input text-lg"
        placeholder="Type your answer..."
        value={answers[slide.id] ?? ''}
        onChange={e => onAnswer(slide.id, e.target.value)}
        autoFocus
      />
    </div>
  )

  if (slide.type === 'textarea') return (
    <textarea
      className="input min-h-[120px] resize-y text-sm leading-relaxed"
      placeholder="Type your answer here..."
      value={answers[slide.id] ?? ''}
      onChange={e => onAnswer(slide.id, e.target.value)}
    />
  )

  if (slide.type === 'multi-input') return (
    <div className="flex flex-col gap-3">
      {slide.inputs?.map(inp => (
        <input
          key={inp.id}
          type={inp.type ?? 'text'}
          className="input"
          placeholder={inp.placeholder}
          value={answers[inp.id] ?? ''}
          onChange={e => onAnswer(inp.id, e.target.value)}
        />
      ))}
    </div>
  )

  if (slide.type === 'cards' || slide.type === 'multi-cards') {
    const isMulti = slide.type === 'multi-cards'
    const selected = isMulti ? (multiAnswers[slide.id] ?? []) : [answers[slide.id]]
    return (
      <div>
        <div className="flex flex-wrap gap-2 mb-0">
          {slide.options?.map(opt => {
            const isSel = selected.includes(opt)
            return (
              <button
                key={opt}
                onClick={() => isMulti ? onMulti(slide.id, opt) : onAnswer(slide.id, opt)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  isSel
                    ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                    : 'border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
        {showConditional && slide.conditional && (
          <div className="mt-4">
            {slide.conditional.inputType === 'textarea' ? (
              <textarea
                className="input min-h-[100px] resize-y text-sm"
                placeholder="Please provide details..."
                value={answers[slide.conditional.showInput] ?? ''}
                onChange={e => onAnswer(slide.conditional!.showInput, e.target.value)}
              />
            ) : (
              <input
                type="text"
                className="input"
                placeholder="Please provide details..."
                value={answers[slide.conditional.showInput] ?? ''}
                onChange={e => onAnswer(slide.conditional!.showInput, e.target.value)}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  return null
}

function ExplainerBlock({ explainer }: { explainer: SlideExplainer }) {
  const [videoOpen, setVideoOpen] = useState(false)
  if (!explainer.is_enabled) return null

  return (
    <div className="bg-brand-50 border-l-4 border-brand-500 rounded-r-lg p-4 mb-6">
      {explainer.title && (
        <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1">
          {explainer.title}
        </p>
      )}
      {explainer.body_text && (
        <p className="text-sm text-brand-800 leading-relaxed mb-3">{explainer.body_text}</p>
      )}
      {explainer.video_url && (
        <button
          onClick={() => setVideoOpen(true)}
          className="flex items-center gap-2 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center">
            <Play size={10} fill="white" color="white" />
          </div>
          Watch explainer video
        </button>
      )}
      {videoOpen && explainer.video_url && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl overflow-hidden w-full max-w-2xl">
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <p className="text-sm font-medium">{explainer.title}</p>
              <button onClick={() => setVideoOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={16} />
              </button>
            </div>
            <div className="aspect-video">
              <iframe
                src={explainer.video_url}
                className="w-full h-full"
                allowFullScreen
                title="Explainer video"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdBanner({ ad }: { ad: Ad }) {
  return (
    <a
      href={ad.click_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 mb-4 hover:border-brand-200 transition-colors group"
    >
      <img
        src={ad.image_url}
        alt={ad.title}
        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">Sponsored</p>
        <p className="text-sm font-medium text-gray-700 truncate group-hover:text-brand-600 transition-colors">
          {ad.title}
        </p>
      </div>
      <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
    </a>
  )
}
