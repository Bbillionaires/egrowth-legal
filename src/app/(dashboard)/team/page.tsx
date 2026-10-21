import { createClient } from '@/lib/supabase/server'
import TeamClient from '@/components/team/TeamClient'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id ?? '').single()
  return <TeamClient team={[]} currentUserId={user?.id ?? ''} currentRole={profile?.role ?? 'staff'} />
}
