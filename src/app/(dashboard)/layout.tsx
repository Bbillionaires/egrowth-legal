'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, ListChecks, FilePlus, FolderLock,
  Shield, Users, Settings, LogOut, Bell, ChevronRight, Stamp
} from 'lucide-react'
import clsx from 'clsx'

type NavItem = {
  href: string
  icon: React.ElementType
  label: string
  roles?: string[]   // if set, only show for these roles
}

const NAV: { label: string; items: NavItem[] }[] = [
  { label: 'Overview',    items: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/queue',     icon: ListChecks,      label: 'Submission Queue' },
    { href: '/notary',    icon: Stamp,           label: 'Notary Queue', roles: ['notary', 'admin', 'master'] },
  ]},
  { label: 'Services',    items: [
    { href: '/interview', icon: FilePlus,   label: 'New Interview' },
    { href: '/vault',     icon: FolderLock, label: 'Document Vault' },
    { href: '/trustee',   icon: Shield,     label: 'Trustee Portal' },
  ]},
  { label: 'Admin',       items: [
    { href: '/team',     icon: Users,    label: 'Team & Roles' },
    { href: '/content',  icon: Settings, label: 'Content Manager' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]},
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [userInitials, setUserInitials] = useState('...')
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()
      if (profile) {
        const name = profile.full_name ?? ''
        const initials = name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((n: string) => n[0].toUpperCase())
          .join('')
        setUserInitials(initials || '?')
        setUserRole(profile.role ?? '')
      }
    }
    loadUser()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Brand */}
        <div className="h-14 flex items-center px-4 border-b border-gray-100">
          <span className="text-sm font-semibold tracking-tight">
            e<span className="text-brand-500">Growth</span>
            <span className="text-gray-400 font-normal ml-1">Legal</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.map(group => {
            const visibleItems = group.items.filter(
              item => !item.roles || item.roles.includes(userRole)
            )
            if (visibleItems.length === 0) return null
            return (
              <div key={group.label} className="mb-4">
                <p className="px-2 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {group.label}
                </p>
                {visibleItems.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm mb-0.5 transition-colors',
                        active
                          ? 'bg-brand-50 text-brand-600 font-medium'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      )}
                    >
                      <item.icon size={14} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="p-2 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <span>eGrowth</span>
            <ChevronRight size={12} />
            <span className="text-gray-700 font-medium capitalize">
              {pathname.split('/').filter(Boolean)[0] || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <Bell size={16} className="text-gray-500" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-medium">
                {userInitials}
              </div>
              {userRole && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                  {userRole}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
