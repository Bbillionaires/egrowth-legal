export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, CheckCircle, AlertCircle, Users } from 'lucide-react'

const statusBadge: Record<string, string> = {
  draft:      'badge badge-pending',
  generated:  'badge badge-pending',
  queued:     'badge badge-pending',
  in_review:  'badge badge-review',
  approved:   'badge badge-active',
  submitted:  'badge badge-review',
  complete:   'badge badge-complete',
  rejected:   'badge badge-rejected',
}

const statusLabel: Record<string, string> = {
  draft:      'Draft',
  generated:  'Generated',
  queued:     'Pending',
  in_review:  'In Review',
  approved:   'Approved',
  submitted:  'Submitted',
  complete:   'Complete',
  rejected:   'Rejected',
}

export default async function ClientHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: client }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase.from('clients').select('id').eq('profile_id', user!.id).single(),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  let submissions: any[] = []
  if (client?.id) {
    const { data } = await supabase
      .from('submission_queue')
      .select('id, status, created_at, document:documents(name, document_type)')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(10)
    submissions = data ?? []
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back, {firstName}.</h1>
        <p className="text-sm text-gray-500 mt-1">Here&apos;s an overview of your documents and account.</p>
      </div>

      {/* Identity verification banner */}
      <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">Verify your identity</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Upload a valid government-issued ID to unlock full document access and e-signing.
          </p>
        </div>
        <Link href="/verify" className="btn-primary text-xs py-1.5 px-3 flex-shrink-0">
          Verify now
        </Link>
      </div>

      {/* Documents */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Your Documents</h2>
          <span className="text-xs text-gray-400">{submissions.length} total</span>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No documents yet.</p>
            <p className="text-xs mt-1">Start an interview to generate your first document.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {submissions.map(item => {
              const doc = item.document as any
              const submittedDate = new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })
              return (
                <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={14} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc?.name ?? 'Document'}</p>
                    <p className="text-xs text-gray-400">
                      {doc?.document_type ?? '—'} &middot; Submitted {submittedDate}
                    </p>
                  </div>
                  <span className={statusBadge[item.status] ?? 'badge badge-pending'}>
                    {statusLabel[item.status] ?? item.status}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/interview/will"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-center group"
          >
            <FileText size={20} className="text-brand-600" />
            <span className="text-xs font-medium text-gray-700 group-hover:text-brand-700">
              Start a Will Interview
            </span>
          </Link>
          <Link
            href="/account/sharing"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-center group"
          >
            <Users size={20} className="text-brand-600" />
            <span className="text-xs font-medium text-gray-700 group-hover:text-brand-700">
              Manage Account Sharing
            </span>
          </Link>
          <Link
            href="/verify"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-center group"
          >
            <CheckCircle size={20} className="text-brand-600" />
            <span className="text-xs font-medium text-gray-700 group-hover:text-brand-700">
              Upload ID
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
