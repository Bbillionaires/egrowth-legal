'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Document } from '@/lib/types'
import { FolderLock, FileText, Download, Upload, Search, Lock } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  clients: { id: string; full_name: string; email: string; state: string | null }[]
  documents: any[]
}

const SERVICE_LABELS: Record<string, string> = {
  trust_estate: 'Trust & Estate',
  for_profit: 'For-Profit',
  nonprofit: 'Nonprofit',
  trustee_service: 'Trustee',
}

export default function VaultClient({ clients, documents }: Props) {
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const filteredClients = clients.filter(c =>
    !search || c.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const clientDocs = documents.filter(d =>
    !selectedClient || d.client_id === selectedClient
  )

  const activeClient = clients.find(c => c.id === selectedClient)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedClient) return
    setUploading(true)

    const path = `${selectedClient}/${Date.now()}_${file.name}`
    const bucket = 'trustee-vault'

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file)
    if (!uploadError) {
      await supabase.from('documents').insert({
        client_id: selectedClient,
        name: file.name,
        document_type: 'uploaded',
        service_type: 'trustee_service',
        status: 'complete',
        storage_path: path,
        is_trustee_file: true,
      })
    }
    setUploading(false)
    e.target.value = ''
  }

  async function downloadDoc(doc: any) {
    const bucket = doc.is_trustee_file ? 'trustee-vault' : 'documents'
    if (!doc.storage_path) return
    const { data } = await supabase.storage.from(bucket).download(doc.storage_path)
    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a'); a.href = url; a.download = doc.name; a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Document Vault</h1>
        <p className="text-sm text-gray-500 mt-0.5">Secure file custody for all eGrowth clients and trustee accounts.</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-11rem)]">
        {/* Client list */}
        <div className="w-60 flex-shrink-0 flex flex-col gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="input pl-8 py-1.5 text-xs"
            />
          </div>
          <div className="card flex-1 overflow-auto p-2">
            <button
              onClick={() => setSelectedClient(null)}
              className={clsx(
                'w-full text-left px-2.5 py-2 rounded-lg text-xs mb-1 transition-colors',
                !selectedClient ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-gray-50 text-gray-600'
              )}
            >
              All Documents ({documents.length})
            </button>
            {filteredClients.map(c => {
              const count = documents.filter(d => d.client_id === c.id).length
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClient(c.id)}
                  className={clsx(
                    'w-full text-left px-2.5 py-2 rounded-lg text-xs mb-0.5 transition-colors',
                    selectedClient === c.id ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-gray-50 text-gray-600'
                  )}
                >
                  <p className="font-medium truncate">{c.full_name}</p>
                  <p className="text-gray-400">{count} file{count !== 1 ? 's' : ''} · {c.state ?? '—'}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Document area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="card mb-3 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderLock size={14} className="text-brand-500" />
              <span className="text-sm font-medium">
                {activeClient ? `${activeClient.full_name} — Files` : 'All Documents'}
              </span>
              <span className="badge bg-gray-100 text-gray-500">{clientDocs.length}</span>
            </div>
            {selectedClient && (
              <label className={clsx('btn-primary text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1.5', uploading && 'opacity-50')}>
                <Upload size={12} />
                {uploading ? 'Uploading...' : 'Upload File'}
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            )}
          </div>

          {/* Doc grid */}
          <div className="card flex-1 overflow-auto">
            {clientDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FolderLock size={32} className="text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">No documents yet</p>
                {selectedClient && (
                  <p className="text-xs text-gray-300 mt-1">Upload files or complete an interview to generate documents.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {clientDocs.map(doc => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-3 hover:border-brand-300 hover:bg-brand-50/30 transition-colors group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-9 h-11 bg-gray-50 border border-gray-200 rounded flex items-center justify-center">
                        <FileText size={14} className="text-gray-400" />
                      </div>
                      {doc.is_trustee_file && (
                        <Lock size={11} className="text-brand-400 mt-0.5" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-800 truncate mb-1">{doc.name}</p>
                    <p className="text-[10px] text-gray-400 mb-2">
                      {SERVICE_LABELS[doc.service_type] ?? doc.service_type} · <span className={`badge ${`badge-${doc.status}`}`}>{doc.status}</span>
                    </p>
                    <p className="text-[10px] text-gray-300 mb-2">
                      {new Date(doc.created_at).toLocaleDateString()}
                      {!selectedClient && doc.client && (
                        <> · {(doc.client as any).full_name}</>
                      )}
                    </p>
                    {doc.storage_path && (
                      <button
                        onClick={() => downloadDoc(doc)}
                        className="w-full flex items-center justify-center gap-1 text-[10px] text-brand-600 hover:text-brand-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download size={10} /> Download
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
