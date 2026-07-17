import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import TeamClient from '@/components/team/TeamClient'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
  return <TeamClient team={[]} currentUserId={user?.id ?? ''} currentRole={profile?.role ?? 'staff'} />
}
