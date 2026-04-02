'use client'
import { useState } from 'react'
import { Profile, UserRole } from '@/lib/types'
import { UserPlus, Edit2, ToggleLeft, ToggleRight, Shield, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const ROLE_HIERARCHY: UserRole[] = ['master', 'admin', 'staff', 'notary', 'client']

const ROLE_COLORS: Record<UserRole, string> = {
  master:  'badge-master',
  admin:   'badge-admin',
  staff:   'badge-staff',
  notary:  'badge-notary',
  client:  'badge-client',
}

interface Props {
  team: any[]
  currentUserId: string
  currentRole: string
}

export default function TeamClient({ team, currentUserId, currentRole }: Props) {
  const [members, setMembers] = useState(team)
  const [showModal, setShowModal] = useState(false)
  const [editMember, setEditMember] = useState<any | null>(null)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'staff' as UserRole, phone: '' })
  const [loading, setLoading] = useState(false)

  // Roles the current user can create
  const creatableRoles: UserRole[] = currentRole === 'master'
    ? ['admin', 'staff', 'notary', 'client']
    : currentRole === 'admin'
    ? ['staff', 'notary', 'client']
    : []

  async function handleCreate() {
    setLoading(true)
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.profile) {
      setMembers(prev => [...prev, data.profile])
      setShowModal(false)
      setForm({ email: '', full_name: '', role: 'staff', phone: '' })
    }
    setLoading(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/team/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    setMembers(prev => prev.map(m => m.id === id ? { ...m, is_active: !current } : m))
  }

  const grouped = ROLE_HIERARCHY.reduce((acc, role) => {
    acc[role] = members.filter(m => m.role === role)
    return acc
  }, {} as Record<UserRole, any[]>)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">Team & Roles</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Master Account controls all access. Admins manage staff and notaries.
          </p>
        </div>
        {creatableRoles.length > 0 && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <UserPlus size={14} /> Add Member
          </button>
        )}
      </div>

      {/* Role hierarchy visual */}
      <div className="card mb-5">
        <p className="text-xs font-medium text-gray-500 mb-3">Role Hierarchy</p>
        <div className="flex items-center gap-2 flex-wrap">
          {(['master','admin','staff','notary','client'] as UserRole[]).map((role, i) => (
            <div key={role} className="flex items-center gap-2">
              <span className={`badge ${ROLE_COLORS[role]} capitalize`}>{role}</span>
              {i < 4 && <ChevronRight size={12} className="text-gray-300" />}
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-400 space-y-1">
          <p><strong className="text-gray-600">Master</strong> — Full platform access. Creates admins. Cannot be modified.</p>
          <p><strong className="text-gray-600">Admin</strong> — Manages clients, documents, queue. Creates staff & notaries.</p>
          <p><strong className="text-gray-600">Staff</strong> — Reviews and processes queue items. Read/update clients.</p>
          <p><strong className="text-gray-600">Notary</strong> — Can mark docs as notarized and upload notary seal.</p>
          <p><strong className="text-gray-600">Client</strong> — Access to own documents and trustee portal only.</p>
        </div>
      </div>

      {/* Team by role */}
      {(Object.entries(grouped) as [UserRole, any[]][])
        .filter(([, list]) => list.length > 0)
        .map(([role, list]) => (
          <div key={role} className="card mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-gray-400" />
              <h2 className="text-sm font-medium capitalize">{role}s</h2>
              <span className="badge bg-gray-100 text-gray-500">{list.length}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-medium text-gray-400">Name</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-400">Email</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-400">Created By</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-400">Status</th>
                  {currentRole === 'master' || currentRole === 'admin' ? (
                    <th className="text-left py-2 text-xs font-medium text-gray-400">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {list.map(member => (
                  <tr key={member.id}>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                          {member.full_name?.charAt(0) ?? '?'}
                        </div>
                        <span className="font-medium">{member.full_name ?? '—'}</span>
                        {member.id === currentUserId && (
                          <span className="badge bg-brand-50 text-brand-600 text-[10px]">You</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-gray-500 text-xs">{member.email}</td>
                    <td className="py-2.5 text-gray-400 text-xs">
                      {member.creator?.full_name ?? '—'}
                    </td>
                    <td className="py-2.5">
                      <span className={clsx('badge', member.is_active ? 'badge-active' : 'bg-gray-100 text-gray-400')}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {(currentRole === 'master' || currentRole === 'admin') && (
                      <td className="py-2.5">
                        {member.id !== currentUserId && member.role !== 'master' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleActive(member.id, member.is_active)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400"
                              title={member.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {member.is_active
                                ? <ToggleRight size={16} className="text-brand-500" />
                                : <ToggleLeft size={16} />
                              }
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {/* Add member modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold mb-4">Add Team Member</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Full Name</label>
                <input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} className="input" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="label">Email Address</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="input" placeholder="jane@egrowth.com" />
              </div>
              <div>
                <label className="label">Phone (optional)</label>
                <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="input" placeholder="(904) 555-0100" />
              </div>
              <div>
                <label className="label">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value as UserRole}))} className="input">
                  {creatableRoles.map(r => (
                    <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              An invite email will be sent. They will set their own password on first login.
            </p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleCreate} disabled={loading || !form.email || !form.full_name} className="btn-primary flex-1">
                {loading ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
