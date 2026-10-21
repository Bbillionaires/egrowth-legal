'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import Fl501c3Wizard from '@/components/intake/fl501c3/Wizard'

export default function ClientNonprofitIntakePage() {
  const [interviewId, setInterviewId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/intake/fl501c3', { method: 'POST' })
      .then(async res => {
        if (res.status === 401) { window.location.href = '/login'; return }
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Could not open the intake.')
        setInterviewId(data.interview_id)
      })
      .catch(e => setError(e.message))
  }, [])

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Link href="/client" className="text-xs text-gray-500 hover:underline">← Back to home</Link>
      <div className="mt-3 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Start a Florida nonprofit</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tell us about your organization so we can prepare its Florida incorporation and 501(c)(3) application.
          Your answers save as you go; you can leave and come back. If you don&apos;t know an answer, tick &ldquo;I don&apos;t know&rdquo; where offered.
        </p>
      </div>
      {error && <div className="card text-sm text-red-700">{error}</div>}
      {!error && !interviewId && <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Opening your intake…</div>}
      {interviewId && <Fl501c3Wizard interviewId={interviewId} canEditSubmitted={false} />}
    </div>
  )
}
