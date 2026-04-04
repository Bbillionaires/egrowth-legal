'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ToggleLeft, ToggleRight, Plus, Eye, EyeOff } from 'lucide-react'

const SLIDE_LABELS = ['Full name','DOB & Address','Aliases','Marital status','Children','Executor','Guardianship','Beneficiaries','Assets','Specific bequests','Debts','Funeral wishes','Special circumstances','Professional contacts']

export default function ContentManagerPage() {
  const [tab, setTab] = useState<'explainers'|'ads'|'verification'>('explainers')
  const [explainers, setExplainers] = useState<any[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [saving, setSaving] = useState<string|null>(null)
  const [showNewAd, setShowNewAd] = useState(false)
  const [newAd, setNewAd] = useState({ title:'', image_url:'', click_url:'', placement:'slide_bottom', priority:1 })
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: exp }, { data: adData }, { data: cl }] = await Promise.all([
      supabase.from('slide_explainers').select('*').order('slide_index'),
      supabase.from('ads').select('*').order('priority'),
      supabase.from('clients').select('id, full_name, email, client_verification(status, id_required)').order('full_name'),
    ])
    setExplainers(exp ?? [])
    setAds(adData ?? [])
    setClients(cl ?? [])
  }

  async function toggleExplainer(id: string, enabled: boolean) {
    setSaving(id)
    await supabase.from('slide_explainers').update({ is_enabled: enabled, updated_at: new Date().toISOString() }).eq('id', id)
    await loadAll()
    setSaving(null)
  }

  async function saveExplainer(explainer: any) {
    setSaving(explainer.id ?? 'new')
    if (explainer.id) {
      await supabase.from('slide_explainers').update({ ...explainer, updated_at: new Date().toISOString() }).eq('id', explainer.id)
    } else {
      await supabase.from('slide_explainers').insert({ ...explainer, updated_at: new Date().toISOString() })
    }
    await loadAll()
    setSaving(null)
  }

  async function toggleAd(id: string, active: boolean) {
    await supabase.from('ads').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', id)
    await loadAll()
  }

  async function saveNewAd(e: React.FormEvent) {
    e.preventDefault()
    setSaving('new-ad')
    await supabase.from('ads').insert({ ...newAd, is_active: true, updated_at: new Date().toISOString() })
    setNewAd({ title:'', image_url:'', click_url:'', placement:'slide_bottom', priority:1 })
    setShowNewAd(false)
    await loadAll()
    setSaving(null)
  }

  async function toggleIdRequired(clientId: string, required: boolean) {
    setSaving(clientId)
    const { data: existing } = await supabase.from('client_verification').select('id').eq('client_id', clientId).single()
    if (existing) {
      await supabase.from('client_verification').update({ id_required: required }).eq('client_id', clientId)
    } else {
      await supabase.from('client_verification').insert({ client_id: clientId, id_required: required })
    }
    await loadAll()
    setSaving(null)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Content Manager</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage slide explainers, ads, and client verification without touching code.</p>
      </div>

      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {(['explainers','ads','verification'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab===t?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {t==='explainers'?'Slide Explainers':t==='ads'?'Ad Slots':'ID Verification'}
          </button>
        ))}
      </div>

      {tab === 'explainers' && (
        <div className="space-y-3">
          {SLIDE_LABELS.map((label, i) => {
            const exp = explainers.find(e => e.service_type==='trust_estate' && e.slide_index===i)
            return <ExplainerRow key={i} index={i} label={label} explainer={exp} saving={saving} onToggle={toggleExplainer} onSave={saveExplainer}/>
          })}
        </div>
      )}

      {tab === 'ads' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{ads.length} ad{ads.length!==1?'s':''} configured</p>
            <button onClick={()=>setShowNewAd(v=>!v)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Plus size={12}/> New Ad
            </button>
          </div>

          {showNewAd && (
            <div className="card mb-4">
              <h3 className="text-sm font-medium mb-4">Add new ad</h3>
              <form onSubmit={saveNewAd} className="space-y-3">
                <div><label className="label">Title *</label><input required value={newAd.title} onChange={e=>setNewAd(a=>({...a,title:e.target.value}))} className="input" placeholder="Life Insurance Quote — Get covered today"/></div>
                <div><label className="label">Image URL *</label><input required value={newAd.image_url} onChange={e=>setNewAd(a=>({...a,image_url:e.target.value}))} className="input" placeholder="https://..."/></div>
                <div><label className="label">Click URL *</label><input required value={newAd.click_url} onChange={e=>setNewAd(a=>({...a,click_url:e.target.value}))} className="input" placeholder="https://..."/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Placement</label>
                    <select value={newAd.placement} onChange={e=>setNewAd(a=>({...a,placement:e.target.value}))} className="input">
                      <option value="slide_top">Top of slide</option>
                      <option value="slide_bottom">Bottom of slide</option>
                      <option value="sidebar">Sidebar</option>
                    </select>
                  </div>
                  <div><label className="label">Priority (1 = highest)</label><input type="number" min={1} value={newAd.priority} onChange={e=>setNewAd(a=>({...a,priority:Number(e.target.value)}))} className="input"/></div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={()=>setShowNewAd(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={saving==='new-ad'} className="btn-primary flex-1">{saving==='new-ad'?'Saving...':'Save Ad'}</button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-3">
            {ads.map(ad => (
              <div key={ad.id} className="card flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                  <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" onError={e=>{(e.target as any).style.display='none'}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ad.title}</p>
                  <p className="text-xs text-gray-400">{ad.placement} · Priority {ad.priority}</p>
                  <a href={ad.click_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 truncate block">{ad.click_url}</a>
                </div>
                <button onClick={()=>toggleAd(ad.id, !ad.is_active)} className="flex-shrink-0">
                  {ad.is_active?<ToggleRight size={22} className="text-brand-500"/>:<ToggleLeft size={22} className="text-gray-300"/>}
                </button>
              </div>
            ))}
            {ads.length===0&&!showNewAd&&<div className="card text-center py-8 text-gray-400 text-sm">No ads configured yet. Click New Ad to add one.</div>}
          </div>
        </div>
      )}

      {tab === 'verification' && (
        <div className="card">
          <p className="text-xs text-gray-500 mb-4 bg-amber-50 p-3 rounded-lg">When ID verification is required, the client must upload a government-issued ID before sharing their account or downloading documents.</p>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left py-2 text-xs font-medium text-gray-400">Client</th>
                <th className="text-left py-2 text-xs font-medium text-gray-400">Verify Status</th>
                <th className="text-left py-2 text-xs font-medium text-gray-400">ID Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((c: any) => {
                const verif = c.client_verification?.[0]
                const idRequired = verif?.id_required ?? false
                const status = verif?.status ?? 'unverified'
                const statusColors: Record<string,string> = { unverified:'bg-gray-100 text-gray-500', pending:'bg-amber-50 text-amber-700', verified:'bg-green-50 text-green-700', rejected:'bg-red-50 text-red-700' }
                return (
                  <tr key={c.id}>
                    <td className="py-3"><p className="font-medium">{c.full_name}</p><p className="text-xs text-gray-400">{c.email}</p></td>
                    <td className="py-3"><span className={`badge ${statusColors[status]??''} capitalize`}>{status}</span></td>
                    <td className="py-3">
                      <button onClick={()=>toggleIdRequired(c.id,!idRequired)} disabled={saving===c.id} className="flex items-center gap-2 text-sm">
                        {idRequired?<><ToggleRight size={20} className="text-brand-500"/><span className="text-brand-600 font-medium">Required</span></>:<><ToggleLeft size={20} className="text-gray-300"/><span className="text-gray-400">Off</span></>}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {clients.length===0&&<tr><td colSpan={3} className="py-6 text-center text-sm text-gray-400">No clients yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ExplainerRow({index,label,explainer,saving,onToggle,onSave}:any) {
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState({ service_type:'trust_estate', slide_index:index, title:explainer?.title??'', body_text:explainer?.body_text??'', video_url:explainer?.video_url??'', is_enabled:explainer?.is_enabled??false })

  useEffect(()=>{
    setForm({ service_type:'trust_estate', slide_index:index, title:explainer?.title??'', body_text:explainer?.body_text??'', video_url:explainer?.video_url??'', is_enabled:explainer?.is_enabled??false })
  },[explainer])

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 flex-shrink-0">{index+1}</div>
        <div className="flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-gray-400">{explainer?.is_enabled?`${explainer.video_url?'Text + video':'Text only'} · Enabled`:'No explainer / disabled'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setExpanded(v=>!v)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400">
            {expanded?<EyeOff size={14}/>:<Eye size={14}/>}
          </button>
          {explainer && (
            <button onClick={()=>onToggle(explainer.id,!explainer.is_enabled)} disabled={saving===explainer.id}>
              {explainer.is_enabled?<ToggleRight size={22} className="text-brand-500"/>:<ToggleLeft size={22} className="text-gray-300"/>}
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          <div><label className="label">Explainer title (optional)</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="input" placeholder="Why this matters"/></div>
          <div><label className="label">Explainer text</label><textarea value={form.body_text} onChange={e=>setForm(f=>({...f,body_text:e.target.value}))} className="input min-h-[80px] resize-y text-sm" placeholder="Explain this question to the client..."/></div>
          <div><label className="label">Video URL (YouTube/Vimeo embed, optional)</label><input value={form.video_url} onChange={e=>setForm(f=>({...f,video_url:e.target.value}))} className="input" placeholder="https://www.youtube.com/embed/..."/></div>
          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_enabled} onChange={e=>setForm(f=>({...f,is_enabled:e.target.checked}))}/>
              Enable this explainer
            </label>
            <button onClick={()=>onSave({...form,id:explainer?.id})} disabled={saving===explainer?.id} className="btn-primary text-xs py-1.5 px-4 ml-auto">
              {saving===explainer?.id?'Saving...':'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
