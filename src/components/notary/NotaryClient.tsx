'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Stamp, Upload, CheckCircle2, Clock, FileText, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

interface NotaryItem {
  id: string
  status: string
  priority: number
  filing_state: string | null
  updated_at: string
  client: { id: string; full_name: string; email: string } | null
  document: {
    id: string
    name: string
    document_type: string
    service_type: string
    notarized_by: string | null
    notarized_path: string | null
  } | null
  assignee: { id: string; full_name: string; role: string } | null
}

interface Props {
  initialItems: NotaryItem[]
  currentUserId: string
}

const PRIORITY_LABEL: Record<number, string> = { 1: 'Urgent', 2: 'High', 3: 'Normal' }
const PRIORITY_CLASS: Record<number, string> = {
  1: 'badge bg-red-50 text-red-700',
  2: 'badge bg-amber-50 text-amber-700',
  3: 'badge bg-gray-100 text-gray-600',
}

export default function NotaryClient({ initialItems, currentUserId }: Props) {
  const [items, setItems] = useState<NotaryItem[]>(initialItems)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetId = useRef<string | null>(null)
  const supabase = createClient()

  const awaitingCount = items.filter(i => i.status === 'approved').length

  async function markNotarized(item: NotaryItem) {
    setBusy(item.id)
    try {
      // Update queue status to completed
      await supabase
        .from('submission_queue')
        .update({ status: 'complete' })
        .eq('id', item.id)

      // Record notarized_by on the document
      if (item.document?.id) {
        await supabase
          .from('documents')
          .update({ notarized_by: currentUserId })
          .eq('id', item.document.id)
      }

      setItems(prev =>
        prev.map(i =>
          i.id === item.id
            ? {
                ...i,
                status: 'complete',
                document: i.document
                  ? { ...i.document, notarized_by: currentUserId }
                  : i.document,
              }
            : i
        )
      )
    } finally {
      setBusy(null)
      setConfirming(null)
    }
  }

  function openSealUpload(queueId: string) {
    uploadTargetId.current = queueId
    fileInputRef.current?.click()
  }

  async function handleSealFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const queueId = uploadTargetId.current
    if (!file || !queueId) return

    setUploading(queueId)
    try {
      const path = `${queueId}/seal.pdf`
      const { error } = await supabase.storage
        .from('signed-documents')
        .upload(path, file, { upsert: true, contentType: 'application/pdf' })

      if (!error) {
        // Persist the path on the document record
        const item = items.find(i => i.id === queueId)
        if (item?.document?.id) {
          await supabase
            .from('documents')
            .update({ notarized_path: path })
            .eq('id', item.document.id)
          setItems(prev =>
            prev.map(i =>
              i.id === queueId && i.document
                ? { ...i, document: { ...i.document, notarized_path: path } }
                : i
            )
          )
        }
      }
    } finally {
      setUploading(null)
      uploadTargetId.current = null
      // Reset so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">Notary Workflow</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Documents approved for notarization and items assigned to you.
          </p>
        </div>

        {/* Summary stat */}
        <div className="card flex items-center gap-3 py-3 px-4">
          <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
            <Clock size={15} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 leading-none">{awaitingCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">awaiting notarization</p>
          </div>
        </div>
      </div>

      {/* Hidden file input for seal upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleSealFile}
      />

      {/* Queue list */}
      {items.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Stamp size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No items in the notary queue.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const isComplete = item.status === 'complete'
            const hasSeal = Boolean(item.document?.notarized_path)
            const isNotarizedByMe = item.document?.notarized_by === currentUserId
            const isBusy = busy === item.id
            const isUploading = uploading === item.id
            const approvalDate = new Date(item.updated_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })

            return (
              <div
                key={item.id}
                className={clsx(
                  'card flex items-start gap-4',
                  isComplete && 'opacity-70'
                )}
              >
                {/* Status icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {isComplete ? (
                    <CheckCircle2 size={20} className="text-green-500" />
                  ) : (
                    <Stamp size={20} className="text-purple-400" />
                  )}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-gray-900 text-sm">
                      {item.client?.full_name ?? '—'}
                    </p>
                    <span className={PRIORITY_CLASS[item.priority] ?? 'badge'}>
                      {PRIORITY_LABEL[item.priority] ?? 'Normal'}
                    </span>
                    {isComplete && (
                      <span className="badge badge-complete">Notarized</span>
                    )}
                    {!isComplete && (
                      <span className="badge badge-notary">Approved — Ready</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5">
                    <FileText size={11} className="text-gray-400" />
                    <span className="truncate max-w-xs">{item.document?.name ?? '—'}</span>
                    <span className="text-gray-300">·</span>
                    <span className="capitalize">
                      {item.document?.document_type?.replace(/_/g, ' ') ?? '—'}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400">
                    {isComplete ? 'Notarized' : 'Approved'} {approvalDate}
                    {item.filing_state && (
                      <span> · {item.filing_state}</span>
                    )}
                    {hasSeal && (
                      <span className="ml-2 text-green-600 font-medium">· Seal uploaded</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                  {/* Upload Notary Seal */}
                  <button
                    onClick={() => openSealUpload(item.id)}
                    disabled={isUploading}
                    className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                  >
                    <Upload size={12} />
                    {isUploading ? 'Uploading…' : hasSeal ? 'Replace Seal' : 'Upload Seal'}
                  </button>

                  {/* Mark as Notarized */}
                  {!isComplete && (
                    confirming === item.id ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                          <AlertTriangle size={11} />
                          Confirm?
                        </div>
                        <button
                          onClick={() => markNotarized(item)}
                          disabled={isBusy}
                          className="btn-primary flex items-center gap-1 text-xs py-1.5 px-3"
                        >
                          {isBusy ? 'Saving…' : 'Yes, notarized'}
                        </button>
                        <button
                          onClick={() => setConfirming(null)}
                          className="btn-ghost text-xs py-1.5 px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirming(item.id)}
                        className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
                      >
                        <Stamp size={12} />
                        Mark as Notarized
                      </button>
                    )
                  )}

                  {isComplete && isNotarizedByMe && (
                    <span className="text-xs text-gray-400 italic">Notarized by you</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
