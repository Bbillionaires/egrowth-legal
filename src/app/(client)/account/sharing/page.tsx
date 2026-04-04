'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, UserPlus, AlertTriangle, X, Eye, Download, Printer } from 'lucide-react'

const DISCLAIMER = `By adding a trusted contact to your eGrowth Legal account, you acknowledge and agree to the following:

1. BACKUP ACCESS ONLY: eGrowth Legal provides document storage as a convenience service. We are not a licensed trustee and do not assume legal responsibility for your documents.

2. YOUR COPY IS PRIMARY: You are solely responsible for maintaining your own secure copies of all legal documents. eGrowth is not liable for any loss, damage, or inaccessibility of documents stored on this platform.

3. AUTHORIZED ACCESS: The person you add will only be able to view and download documents you have stored here. They cannot modify, delete, or take any action on your behalf.

4. IDENTITY VERIFICATION: You confirm that the information provided for your trusted contact is accurate and complete. Providing false information may result in account termination.

5. FRAUD PREVENTION: eGrowth reserves the right to verify the identity of any delegate and revoke access if fraud or misuse is suspected.

6. NO LIABILITY: eGrowth Legal LLC is not liable for any legal, financial, or personal consequences arising from granting access to your account.

By clicking "I Agree and Add Delegate", you confirm you have read and accepted these terms.`

export default function AccountSharingPage() {
  const [delegates, setDelegates] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [disclaimerScrolled, setDisclaimerScrolled] = useState(false)
  const [pendingDelegate, setPendingDelegate] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [clientId, setClientId] = useState<string|null>(null)
  const [idVerified, setIdVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ delegate_full_name:'', delegate_email:'', delegate_phone:'', delegate_dob:'', delegate_address:'', relationship:'', relationship_detail:'' })
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

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
    if (!client) { setLoading(false); return }
    setClientId(client.id)

    const [{ data: del }, { data: verif }] = await Promise.all([
      supabase.from('account_delegates').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('client_verification').select('status, id_required').eq('client_id', client.id).single(),
    ])
    setDelegates(del ?? [])
    setIdVerified(verif?.status === 'verified')
    setLoading(false)
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPendingDelegate(form)
    setShowForm(false)
    setShowDisclaimer(true)
    setDisclaimerScrolled(false)
  }

  async function confirmDelegate() {
    if (!pendingDelegate || !clientId) return
    setSaving(true)
    await supabase.from('account_delegates').insert({
      client_id: clientId, ...pendingDelegate,
      disclaimer_signed: true, disclaimer_signed_at: new Date().toISOString(), status: 'pending',
    })
    setShowDisclaimer(false)
    setPendingDelegate(null)
    setForm({ delegate_full_name:'', delegate_email:'', delegate_phone:'', delegate_dob:'', delegate_address:'', relationship:'', relationship_detail:'' })
    await loadData()
    setSaving(false)
  }

  async function revokeDelegate(id: string) {
    await supabase.from('account_delegates').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', id)
    await loadData()
  }

  const statusBadge: Record<string,string> = { pending:'bg-amber-50 text-amber-700', active:'bg-green-50 text-green-700', revoked:'bg-gray-100 text-gray-400' }

  if (loading) return <div className="max-w-2xl mx-auto py-8 px-4 text-sm text-gray-400">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Trusted Contacts</h1>
        <p className="text-sm text-gray-500 mt-1">Share view-only access to your documents with a family member, guardian, or attorney.</p>
      </div>

      {!idVerified && (
        <div className="card mb-5 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0"/>
            <div>
              <p className="text-sm font-medium text-amber-800">Identity verification required</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">You must verify your identity before adding trusted contacts. This protects you and your delegates from fraud.</p>
              <a href="/verify" className="btn-primary text-xs mt-3 inline-block px-4 py-2">Verify my identity</a>
            </div>
          </div>
        </div>
      )}

      {delegates.length > 0 && (
        <div className="card mb-5">
          <h2 className="text-sm font-medium mb-4">Your trusted contacts</h2>
          <div className="space-y-3">
            {delegates.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-medium text-brand-700 flex-shrink-0">{d.delegate_full_name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.delegate_full_name}</p>
                  <p className="text-xs text-gray-400">{d.delegate_email} · {d.relationship}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge text-xs ${statusBadge[d.status]??''}`}>{d.status}</span>
                  <div className="flex gap-1 text-gray-300">
                    {d.can_view_history && <Eye size={12}/>}
                    {d.can_download && <Download size={12}/>}
                    {d.can_print && <Printer size={12}/>}
                  </div>
                  {d.status !== 'revoked' && (
                    <button onClick={()=>revokeDelegate(d.id)} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-500 transition-colors"><X size={13}/></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {idVerified && !showForm && (
        <button onClick={()=>setShowForm(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={14}/> Add trusted contact
        </button>
      )}

      {showForm && (
        <div className="card">
          <h2 className="text-sm font-medium mb-4">Add a trusted contact</h2>
          <p className="text-xs text-gray-500 mb-5 leading-relaxed bg-gray-50 p-3 rounded-lg">This person will be able to view and download your stored documents only. Full identity information is required to prevent fraud.</p>
          <form onSubmit={handleFormSubmit} className="space-y-3">
            <div><label className="label">Full legal name *</label><input required value={form.delegate_full_name} onChange={e=>setForm(f=>({...f,delegate_full_name:e.target.value}))} className="input" placeholder="Jane Marie Smith"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Email address *</label><input required type="email" value={form.delegate_email} onChange={e=>setForm(f=>({...f,delegate_email:e.target.value}))} className="input" placeholder="jane@email.com"/></div>
              <div><label className="label">Phone number *</label><input required value={form.delegate_phone} onChange={e=>setForm(f=>({...f,delegate_phone:e.target.value}))} className="input" placeholder="(904) 555-0100"/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Date of birth *</label><input required type="date" value={form.delegate_dob} onChange={e=>setForm(f=>({...f,delegate_dob:e.target.value}))} className="input"/></div>
              <div><label className="label">Relationship *</label>
                <select required value={form.relationship} onChange={e=>setForm(f=>({...f,relationship:e.target.value}))} className="input">
                  <option value="">Select relationship</option>
                  <option>Spouse</option><option>Adult child</option><option>Parent</option><option>Sibling</option><option>Attorney</option><option>Guardian</option><option>Trusted friend</option><option>Other</option>
                </select>
              </div>
            </div>
            <div><label className="label">Full address *</label><input required value={form.delegate_address} onChange={e=>setForm(f=>({...f,delegate_address:e.target.value}))} className="input" placeholder="123 Main St, Jacksonville, FL 32201"/></div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={()=>setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">Review & Add →</button>
            </div>
          </form>
        </div>
      )}

      {showDisclaimer && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:'16px'}}>
          <div style={{background:'white',borderRadius:'12px',width:'100%',maxWidth:'520px',maxHeight:'85vh',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'16px 20px',borderBottom:'0.5px solid #e5e7eb',display:'flex',alignItems:'center',gap:'10px'}}>
              <Shield size={16} color="#1a6b4a"/>
              <p style={{fontSize:'14px',fontWeight:500}}>Account sharing disclaimer</p>
            </div>
            <div
              onScroll={e=>{const el=e.currentTarget;if(el.scrollHeight-el.scrollTop<=el.clientHeight+40) setDisclaimerScrolled(true)}}
              style={{flex:1,overflowY:'auto',padding:'20px',fontSize:'13px',color:'#374151',lineHeight:1.7,whiteSpace:'pre-line'}}
            >{DISCLAIMER}</div>
            {!disclaimerScrolled && <p style={{textAlign:'center',fontSize:'11px',color:'#9ca3af',padding:'8px',borderTop:'0.5px solid #f3f4f6'}}>Scroll to read the full disclaimer before agreeing</p>}
            <div style={{padding:'14px 20px',borderTop:'0.5px solid #e5e7eb',display:'flex',gap:'10px'}}>
              <button onClick={()=>setShowDisclaimer(false)} style={{flex:1,padding:'9px',border:'0.5px solid #e5e7eb',borderRadius:'8px',background:'transparent',fontSize:'13px',cursor:'pointer',color:'#6b7280'}}>Cancel</button>
              <button onClick={confirmDelegate} disabled={!disclaimerScrolled||saving} style={{flex:2,padding:'9px',background:disclaimerScrolled?'#1a6b4a':'#d1d5db',border:'none',borderRadius:'8px',color:'white',fontSize:'13px',cursor:disclaimerScrolled?'pointer':'not-allowed',fontWeight:500}}>
                {saving?'Saving...':'I Agree and Add Delegate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
