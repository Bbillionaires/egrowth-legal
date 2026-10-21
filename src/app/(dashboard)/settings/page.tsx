'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setFullName(data.full_name ?? '')
        setPhone(data.phone ?? '')
      }
    }
    load()
  }, [])

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMsg(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id)
    setProfileLoading(false)
    if (error) {
      setProfileMsg({ type: 'error', text: error.message })
    } else {
      setProfile((p: any) => ({ ...p, full_name: fullName, phone }))
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)
    if (error) {
      setPasswordMsg({ type: 'error', text: error.message })
    } else {
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMsg({ type: 'success', text: 'Password updated successfully.' })
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and platform configuration.</p>
      </div>

      <div className="max-w-xl space-y-4">
        {/* Profile */}
        <div className="card">
          <h2 className="text-sm font-medium mb-4">Your Profile</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-white text-base font-medium">
              {profile?.full_name?.charAt(0) ?? '?'}
            </div>
            <div>
              <p className="font-medium">{profile?.full_name}</p>
              <p className="text-xs text-gray-400">{profile?.email}</p>
              <span className={`badge badge-${profile?.role} capitalize mt-1`}>{profile?.role}</span>
            </div>
          </div>
          <form onSubmit={handleProfileSave} className="space-y-3">
            <div>
              <label className="label">Full Name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(904) 555-0100" className="input" />
            </div>
            {profileMsg && (
              <p className={`text-xs ${profileMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {profileMsg.text}
              </p>
            )}
            <button type="submit" disabled={profileLoading} className="btn-primary text-sm">
              {profileLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Platform settings (master/admin only) */}
        {profile?.role && ['master', 'admin'].includes(profile.role) && (
          <div className="card">
            <h2 className="text-sm font-medium mb-4">Platform Configuration</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Company Name</label>
                <input defaultValue="eGrowth Legal LLC" className="input" />
              </div>
              <div>
                <label className="label">Default Trustee Flat Fee ($/yr)</label>
                <input defaultValue="500" type="number" className="input" />
              </div>
              <div>
                <label className="label">Default Trustee % Fee</label>
                <input defaultValue="1.5" type="number" step="0.1" className="input" />
              </div>
              <div>
                <label className="label">Notification Email</label>
                <input defaultValue="admin@egrowth.com" type="email" className="input" />
              </div>
              <button className="btn-primary text-sm">Save Configuration</button>
            </div>
          </div>
        )}

        {/* Password */}
        <div className="card">
          <h2 className="text-sm font-medium mb-4">Change Password</h2>
          <form onSubmit={handlePasswordSave} className="space-y-3">
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </div>
            {passwordMsg && (
              <p className={`text-xs ${passwordMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {passwordMsg.text}
              </p>
            )}
            <button type="submit" disabled={passwordLoading} className="btn-primary text-sm">
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
