'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ServiceType, InterviewAnswers, WIZARD_STEPS } from '@/lib/types'
import StepService from '@/components/interview/StepService'
import StepClientInfo from '@/components/interview/StepClientInfo'
import StepDetails from '@/components/interview/StepDetails'
import StepReview from '@/components/interview/StepReview'
import StepGenerate from '@/components/interview/StepGenerate'
import { Check } from 'lucide-react'
import clsx from 'clsx'

export default function InterviewPage() {
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState<InterviewAnswers>({})
  const [clientId, setClientId] = useState<string | null>(null)
  const [interviewId, setInterviewId] = useState<string | null>(null)
  const [generatedDocs, setGeneratedDocs] = useState<string[]>([])
  const supabase = createClient()
  const router = useRouter()

  function updateAnswers(partial: Partial<InterviewAnswers>) {
    setAnswers(prev => ({ ...prev, ...partial }))
  }

  async function saveProgress(currentStep: number, nextStep: number) {
    if (!interviewId) return
    await supabase.from('interviews').update({
      current_step: nextStep,
      answers,
    }).eq('id', interviewId)
  }

  async function next() {
    if (step < 5) {
      await saveProgress(step, step + 1)
      setStep(s => s + 1)
    }
  }

  function prev() {
    if (step > 1) setStep(s => s - 1)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold">New Client Interview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Walk through the guided interview to generate documents.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center mb-8 max-w-2xl">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 transition-colors',
                s.id < step  ? 'bg-brand-500 text-white' :
                s.id === step ? 'border-2 border-brand-500 text-brand-600' :
                'border border-gray-200 text-gray-400'
              )}>
                {s.id < step ? <Check size={12} /> : s.id}
              </div>
              <span className={clsx(
                'text-xs hidden sm:block',
                s.id === step ? 'font-medium text-gray-900' : 'text-gray-400'
              )}>
                {s.title}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={clsx(
                'flex-1 h-px mx-3 transition-colors',
                s.id < step ? 'bg-brand-500' : 'bg-gray-200'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="max-w-2xl">
        {step === 1 && (
          <StepService
            answers={answers}
            onChange={updateAnswers}
            onNext={async () => {
              // Create interview record
              const { data: { user } } = await supabase.auth.getUser()
              const { data: interview } = await supabase.from('interviews').upsert({
                client_id: '00000000-0000-0000-0000-000000000000',
                service_type: answers.service_type ?? 'trust_estate',
                status: 'in_progress',
                current_step: 2,
                answers,
                started_by: user?.id,
              }, { onConflict: 'client_id,service_type', ignoreDuplicates: false }).select().single()
              if (interview) setInterviewId(interview.id)
              setStep(2)
            }}
          />
        )}
        {step === 2 && (
          <StepClientInfo
            answers={answers}
            onChange={updateAnswers}
            onNext={async () => {
              // Upsert client
              const { data: client } = await supabase.from('clients').insert({
                full_name: answers.full_name ?? '',
                email: answers.email ?? '',
                phone: answers.phone,
                dob: answers.dob,
                state: answers.state,
              }).select().single()
              if (client) {
                setClientId(client.id)
                if (interviewId) {
                  await supabase.from('interviews').update({ client_id: client.id }).eq('id', interviewId)
                }
              }
              await next()
            }}
            onBack={prev}
          />
        )}
        {step === 3 && (
          <StepDetails
            answers={answers}
            onChange={updateAnswers}
            onNext={next}
            onBack={prev}
          />
        )}
        {step === 4 && (
          <StepReview
            answers={answers}
            onNext={async () => {
              // Generate documents and add to queue
              const docs = getDocumentList(answers.service_type ?? 'trust_estate', answers)
              const lastName = answers.full_name?.split(' ').pop() ?? 'Client'

              if (clientId) {
                const docInserts = docs.map(d => ({
                  client_id: clientId,
                  interview_id: interviewId,
                  name: `${lastName}_${d.replace(/ /g,'_')}.docx`,
                  document_type: d,
                  service_type: answers.service_type ?? 'trust_estate',
                  status: 'queued',
                  is_trustee_file: answers.use_egrowth_trustee === true,
                }))

                const { data: createdDocs } = await supabase
                  .from('documents').insert(docInserts).select()

                if (createdDocs) {
                  setGeneratedDocs(createdDocs.map(d => d.name))
                  // Add to submission queue
                  await supabase.from('submission_queue').insert(
                    createdDocs.map(d => ({
                      document_id: d.id,
                      client_id: clientId,
                      filing_state: answers.state,
                      priority: 3,
                      status: 'queued',
                    }))
                  )
                  // Complete interview
                  if (interviewId) {
                    await supabase.from('interviews').update({
                      status: 'completed',
                      completed_at: new Date().toISOString(),
                    }).eq('id', interviewId)
                  }
                }
              }
              setStep(5)
            }}
            onBack={prev}
          />
        )}
        {step === 5 && (
          <StepGenerate
            answers={answers}
            documents={generatedDocs}
            onViewQueue={() => router.push('/queue')}
            onNewInterview={() => {
              setStep(1)
              setAnswers({})
              setClientId(null)
              setInterviewId(null)
              setGeneratedDocs([])
            }}
          />
        )}
      </div>
    </div>
  )
}

function getDocumentList(service: ServiceType, answers: InterviewAnswers): string[] {
  const map: Record<ServiceType, string[]> = {
    trust_estate: [
      answers.trust_type ?? 'Revocable Living Trust',
      'Pour-Over Will',
      'Durable Power of Attorney',
      'Healthcare Directive',
    ],
    for_profit: ['Articles of Organization', 'Operating Agreement', 'Initial Resolutions'],
    nonprofit: ['Articles of Incorporation', 'Bylaws', 'Conflict of Interest Policy'],
    trustee_service: ['Trustee Agreement', 'File Custody Agreement', 'Fee Schedule'],
  }
  return map[service] ?? []
}
