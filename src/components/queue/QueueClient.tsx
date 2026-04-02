'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QueueItem, Profile, DocumentStatus } from '@/lib/types'
import { Search, Filter, UserCheck, CheckCheck, X, FileText, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

const STATUS_FILTERS = ['all', 'queued', 'in_review', 'approved', 'submitted', 'complete', 'rejected'] as const
const PRIORITY_LABEL: Record<number, string> = { 1: 'Urgent', 2: 'High', 3: 'Normal' }
const PRIORITY_CLASS: Record<number, string> = {
  1: 'badge bg-red-50 text-red-700',
  2: 'badge bg-amber-50 text-amber-700',
  3: 'badge bg-gray-100 text-gray-600',
}

interface Props {
  initialItems: any[]
  staff: Pick<Profile, 'id' | 'full_name' | 'role'>[]
}

export default function QueueClient({ initialItems, staff }: Props) {
  const [items, setItems] = useState(initialItems)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const supabase = createClient()

  const filtered = items.filter(item => {
    const matchStatus = filter === 'all' || item.status === filter
    const matchSearch = !search ||
      item.client?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.document?.name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  async function updateStatus(id: string, status: DocumentStatus) {
    await supabase.from('submission_queue').update({
      status,
      submitted_at: status === 'submitted' ? new Date().toISOString() : null,
    }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

  async function assignTo(id: string, staffId: string) {
    await supabase.from('submission_queue').update({ assigned_to: staffId }).eq('id', id)
    const staffMember = staff.find(s => s.id === staffId)
    setItems(prev => prev.map(i => i.id === id ? { ...i, assigned_to: staffId, assignee: staffMember } : i))
  }

  async function updatePriority(id: string, priority: number) {
    await supabase.from('submission_queue').update({ priority }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, priority } : i))
  }

  const selectedItem = items.find(i => i.id === selected)

  const counts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = s === 'all' ? items.length : items.filter(i => i.status === s).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Submission Queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Staff review and manually submit documents. No automated submissions — protects against IP bans.
        </p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-11rem)]">
        {/* Left: table */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Filters */}
          <div className="card mb-3 p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search client or document..."
                  className="input pl-8 py-1.5 text-xs"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {STATUS_FILTERS.map(s => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={clsx(
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize',
                      filter === s
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {s} {counts[s] > 0 && `(${counts[s]})`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card flex-1 overflow-auto p-0">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Document</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">State</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Priority</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Assigned</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                      No items match your filter.
                    </td>
                  </tr>
                )}
                {filtered.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => setSelected(selected === item.id ? null : item.id)}
                    className={clsx(
                      'cursor-pointer transition-colors',
                      selected === item.id ? 'bg-brand-50' : 'hover:bg-gray-50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 flex-shrink-0">
                          {item.client?.full_name?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.client?.full_name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{item.client?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-gray-400" />
                        <span className="text-gray-700 truncate max-w-[180px]">{item.document?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.filing_state ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={PRIORITY_CLASS[item.priority] ?? 'badge'}>
                        {PRIORITY_LABEL[item.priority] ?? 'Normal'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {item.assignee?.full_name ?? <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge badge-${item.status.replace('_', '')}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: detail panel */}
        {selectedItem && (
          <div className="w-72 flex-shrink-0 flex flex-col gap-3">
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Queue Item</p>
                <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-gray-100">
                  <X size={13} className="text-gray-400" />
                </button>
              </div>

              {/* Client */}
              <div className="mb-4">
                <p className="label">Client</p>
                <p className="text-sm font-medium">{selectedItem.client?.full_name}</p>
                <p className="text-xs text-gray-400">{selectedItem.client?.email}</p>
              </div>

              {/* Document */}
              <div className="mb-4">
                <p className="label">Document</p>
                <p className="text-sm">{selectedItem.document?.name}</p>
                <p className="text-xs text-gray-400 capitalize">{selectedItem.document?.service_type?.replace('_',' ')}</p>
              </div>

              {/* Assign */}
              <div className="mb-4">
                <p className="label">Assign To</p>
                <select
                  value={selectedItem.assigned_to ?? ''}
                  onChange={e => assignTo(selectedItem.id, e.target.value)}
                  className="input text-xs"
                >
                  <option value="">— Unassigned —</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="mb-4">
                <p className="label">Priority</p>
                <select
                  value={selectedItem.priority}
                  onChange={e => updatePriority(selectedItem.id, Number(e.target.value))}
                  className="input text-xs"
                >
                  <option value={1}>1 — Urgent</option>
                  <option value={2}>2 — High</option>
                  <option value={3}>3 — Normal</option>
                </select>
              </div>

              {/* Status actions */}
              <p className="label mb-2">Update Status</p>
              <div className="grid grid-cols-2 gap-2">
                {(['in_review','approved','submitted','complete','rejected'] as DocumentStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selectedItem.id, s)}
                    disabled={selectedItem.status === s}
                    className={clsx(
                      'text-xs py-1.5 px-2 rounded-lg border transition-colors capitalize',
                      selectedItem.status === s
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    )}
                  >
                    {s.replace('_',' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirmation number (once submitted) */}
            {selectedItem.status === 'submitted' && (
              <div className="card">
                <p className="label">Confirmation #</p>
                <input
                  defaultValue={selectedItem.confirmation_no ?? ''}
                  onBlur={async e => {
                    await supabase.from('submission_queue')
                      .update({ confirmation_no: e.target.value })
                      .eq('id', selectedItem.id)
                  }}
                  placeholder="Enter state confirmation number"
                  className="input text-xs"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
