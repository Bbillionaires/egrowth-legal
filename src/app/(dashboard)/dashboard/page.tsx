export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Users, FileText, Clock, DollarSign, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Parallel data fetches
  const [
    { count: clientCount },
    { count: pendingCount },
    { count: docCount },
    { data: recentQueue },
    { data: profile },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('submission_queue').select('*', { count: 'exact', head: true }).in('status', ['queued', 'in_review']),
    supabase.from('documents').select('*', { count: 'exact', head: true }),
    supabase.from('submission_queue')
      .select('*, client:clients(full_name), document:documents(name, service_type)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('profiles').select('full_name, role').eq('id', user?.id ?? '').single(),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const stats = [
    { label: 'Active Clients',    value: clientCount ?? 0,    icon: Users,     delta: '+3 this week',  color: 'text-brand-600' },
    { label: 'Pending Review',    value: pendingCount ?? 0,   icon: Clock,     delta: 'Needs attention', color: 'text-amber-600' },
    { label: 'Docs Generated',    value: docCount ?? 0,       icon: FileText,  delta: 'All time',        color: 'text-blue-600' },
    { label: 'Trustee Revenue',   value: '$0',                icon: DollarSign,delta: 'This month',      color: 'text-emerald-600' },
  ]

  const statusBadge: Record<string, string> = {
    queued:     'badge badge-pending',
    in_review:  'badge badge-review',
    complete:   'badge badge-complete',
    approved:   'badge badge-active',
    rejected:   'badge badge-rejected',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Good morning, {firstName}.</h1>
        <p className="text-sm text-gray-500 mt-0.5">Here&apos;s what needs your attention today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <s.icon size={14} className={s.color} />
            </div>
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.delta}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Queue preview */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">Submission Queue</h2>
            <Link href="/queue" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowUpRight size={10} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentQueue && recentQueue.length > 0 ? recentQueue.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 flex-shrink-0">
                  {(item.client as any)?.full_name?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{(item.client as any)?.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{(item.document as any)?.name ?? '—'}</p>
                </div>
                <span className={statusBadge[item.status] ?? 'badge badge-pending'}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>
            )) : (
              <p className="text-sm text-gray-400 text-center py-4">Queue is empty</p>
            )}
          </div>
        </div>

        {/* Service breakdown */}
        <div className="card">
          <h2 className="text-sm font-medium mb-4">Service Breakdown</h2>
          {[
            { label: 'Trusts & Estate Planning', pct: 42, color: 'bg-brand-500' },
            { label: 'LLC / For-Profit',         pct: 31, color: 'bg-blue-500' },
            { label: 'Nonprofit Registration',   pct: 18, color: 'bg-amber-500' },
            { label: 'Trustee Services',         pct: 9,  color: 'bg-purple-500' },
          ].map(row => (
            <div key={row.label} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">{row.label}</span>
                <span className="font-medium">{row.pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full">
                <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">Quick Actions</p>
            <div className="flex gap-2">
              <Link href="/interview" className="btn-primary text-xs py-1.5 px-3">
                + New Interview
              </Link>
              <Link href="/queue" className="btn-secondary text-xs py-1.5 px-3">
                Review Queue
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
