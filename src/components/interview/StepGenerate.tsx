'use client'
import { InterviewAnswers } from '@/lib/types'
import { CheckCircle, FileText, ArrowRight, Plus } from 'lucide-react'

interface Props {
  answers: InterviewAnswers
  documents: string[]
  onViewQueue: () => void
  onNewInterview: () => void
}

export default function StepGenerate({ answers, documents, onViewQueue, onNewInterview }: Props) {
  return (
    <div className="card text-center">
      <div className="flex items-center justify-center w-14 h-14 bg-brand-50 rounded-full mx-auto mb-4">
        <CheckCircle size={28} className="text-brand-500" />
      </div>

      <h2 className="text-base font-semibold mb-1">Documents Generated</h2>
      <p className="text-sm text-gray-500 mb-6">
        {documents.length} document{documents.length !== 1 ? 's' : ''} created and queued for staff review.
      </p>

      <div className="space-y-2 text-left mb-6">
        {documents.map(doc => (
          <div key={doc} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2.5">
              <FileText size={14} className="text-gray-400" />
              <span className="text-sm">{doc}</span>
            </div>
            <span className="badge badge-pending">Queued</span>
          </div>
        ))}
      </div>

      {answers.use_egrowth_trustee && (
        <div className="mb-6 p-3 bg-brand-50 border border-brand-200 rounded-lg text-left text-sm text-brand-700">
          <strong>Trustee service activated.</strong> Files will be stored in the eGrowth secure vault once processed.
          The client will receive a trustee agreement for signature.
        </div>
      )}

      <div className="flex gap-3 justify-center pt-4 border-t border-gray-100">
        <button onClick={onNewInterview} className="btn-secondary flex items-center gap-2">
          <Plus size={14} /> New Interview
        </button>
        <button onClick={onViewQueue} className="btn-primary flex items-center gap-2">
          View Queue <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
