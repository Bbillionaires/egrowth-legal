import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id ?? '').single()

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
          <div className="space-y-3">
            <div>
              <label className="label">Full Name</label>
              <input defaultValue={profile?.full_name ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input defaultValue={profile?.phone ?? ''} placeholder="(904) 555-0100" className="input" />
            </div>
            <button className="btn-primary text-sm">Save Changes</button>
          </div>
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
          <div className="space-y-3">
            <div>
              <label className="label">New Password</label>
              <input type="password" placeholder="••••••••" className="input" />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" placeholder="••••••••" className="input" />
            </div>
            <button className="btn-primary text-sm">Update Password</button>
          </div>
        </div>
      </div>
    </div>
  )
}
