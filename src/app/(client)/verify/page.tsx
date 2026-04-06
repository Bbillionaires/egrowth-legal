'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Upload, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react'

export default function VerifyIdentityPage() {
  const [status, setStatus] = useState<string>('unverified')
  const [idType, setIdType] = useState('')
  const [frontFile, setFrontFile] = useState<File|null>(null)
  const [backFile, setBackFile] = useState<File|null>(null)
  const [selfieFile, setSelfieFile] = useState<File|null>(null)
  const [uploading, setUploading] = useState(false)
  const [clientId, setClientId] = useState<string|null>(null)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get or create client record
    let { data: client } = await supabase.from('clients').select('id').eq('profile_id', user.id).single()
    if (!client) {
      const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single()
      const { data: newClient } = await supabase.from('clients').insert({
        profile_id: user.id,
        full_name: profile?.full_name ?? 'New Client',
        email: profile?.email ?? user.email ?? '',
        created_by: user.id,
      }).select('id').single()
      client = newClient
    }
    if (!client) return
    setClientId(client.id)

    const { data: verif } = await supabase.from('client_verification').select('status').eq('client_id', client.id).single()
    if (verif) setStatus(verif.status)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const currentIdType = idType
    const currentFrontFile = frontFile
    if (!currentFrontFile || !clientId || !currentIdType) { 
      setError('Please select your ID type and upload the front of your ID.')
      return 
    }
    setError('')
    setUploading(true)
  
    async function uploadFile(file: File, path: string) {
      const { data, error } = await supabase.storage.from('client-ids').upload(path, file, { upsert: true })
      if (error) throw error
      return data?.path ?? null
    }
  
    try {
      const ts = Date.now()
      const frontPath = await uploadFile(currentFrontFile, `${clientId}/${ts}_front`)
      const backPath = backFile ? await uploadFile(backFile, `${clientId}/${ts}_back`) : null
      const selfiePath = selfieFile ? await uploadFile(selfieFile, `${clientId}/${ts}_selfie`) : null
  
      const { data: existing } = await supabase.from('client_verification').select('id').eq('client_id', clientId).single()
      if (existing) {
        await supabase.from('client_verification').update({
          id_type: currentIdType,
          id_front_path: frontPath,
          id_back_path: backPath,
          selfie_path: selfiePath,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        }).eq('client_id', clientId)
      } else {
        await supabase.from('client_verification').insert({
          client_id: clientId,
          id_type: currentIdType,
          id_front_path: frontPath,
          id_back_path: backPath,
          selfie_path: selfiePath,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        })
      }
      setStatus('pending')
    } catch (err: any) {
      console.error(err)
      setError('Upload failed: ' + (err.message ?? 'Please try again.'))
    }
    setUploading(false)
  }
  const statusConfig: Record<string,{icon:React.ReactNode;title:string;desc:string;color:string}> = {
    pending: { icon:<Clock size={28} className="text-amber-500"/>, title:'Verification pending', desc:'Your documents have been submitted and are being reviewed. This usually takes 1–2 business days.', color:'bg-amber-50' },
    verified: { icon:<CheckCircle size={28} className="text-green-500"/>, title:'Identity verified', desc:'Your identity has been verified. You can now add trusted contacts and access all features.', color:'bg-green-50' },
    rejected: { icon:<XCircle size={28} className="text-red-500"/>, title:'Verification rejected', desc:'Your verification was not accepted. Please re-submit clear photos of your government-issued ID.', color:'bg-red-50' },
  }

  const statusInfo = statusConfig[status]
  if (statusInfo && status !== 'unverified') {
    return (
      <div className="max-w-lg mx-auto py-10 px-4 text-center">
        <div className={`${statusInfo.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>{statusInfo.icon}</div>
        <h1 className="text-xl font-semibold mb-2">{statusInfo.title}</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">{statusInfo.desc}</p>
        {status === 'rejected' && <button onClick={()=>setStatus('unverified')} className="btn-primary">Re-submit verification</button>}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield size={24} className="text-brand-500"/>
        </div>
        <h1 className="text-xl font-semibold mb-2">Verify your identity</h1>
        <p className="text-sm text-gray-500 leading-relaxed">Required to protect your account and enable trusted contact sharing. Your documents are stored securely and never shared.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card">
          <label className="label">Type of ID *</label>
          <select required value={idType} onChange={e=>setIdType(e.target.value)} className="input">
            <option value="">Select ID type</option>
            <option value="drivers_license">Driver's License</option>
            <option value="passport">Passport</option>
            <option value="state_id">State ID</option>
          </select>
        </div>

        <div className="card">
          <label className="label">Front of ID *</label>
          <p className="text-xs text-gray-400 mb-3">Clear photo showing your full name, photo, and ID number</p>
          <FileUploadZone file={frontFile} onChange={setFrontFile} label="Upload front of ID"/>
        </div>

        <div className="card">
          <label className="label">Back of ID (if applicable)</label>
          <FileUploadZone file={backFile} onChange={setBackFile} label="Upload back of ID"/>
        </div>

        <div className="card">
          <label className="label">Selfie holding your ID (recommended)</label>
          <p className="text-xs text-gray-400 mb-3">Speeds up verification significantly</p>
          <FileUploadZone file={selfieFile} onChange={setSelfieFile} label="Upload selfie with ID"/>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

        <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 leading-relaxed">
          <AlertTriangle size={12} className="inline mr-1 text-amber-500"/>
          Your documents are encrypted and stored securely. They are only accessed by our verification team and never shared with third parties.
        </div>

        <button type="submit" disabled={uploading || !frontFile || !idType} className="btn-primary w-full py-3">
          {uploading ? 'Uploading...' : 'Submit for verification'}
        </button>
      </form>
    </div>
  )
}

function FileUploadZone({file,onChange,label}:{file:File|null;onChange:(f:File)=>void;label:string}) {
  return (
    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${file?'border-brand-400 bg-brand-50':'border-gray-200 hover:border-brand-300 hover:bg-gray-50'}`}>
      {file ? (
        <div className="text-center">
          <CheckCircle size={20} className="text-brand-500 mx-auto mb-2"/>
          <p className="text-sm font-medium text-brand-700">{file.name}</p>
          <p className="text-xs text-brand-500">{(file.size/1024).toFixed(0)} KB · Click to change</p>
        </div>
      ) : (
        <div className="text-center">
          <Upload size={20} className="text-gray-400 mx-auto mb-2"/>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, or PDF · Max 10MB</p>
        </div>
      )}
      <input type="file" className="hidden" accept="image/*,.pdf" onChange={e=>e.target.files?.[0]&&onChange(e.target.files[0])}/>
    </label>
  )
}
