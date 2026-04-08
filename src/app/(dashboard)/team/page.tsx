import { createClient } from '@/lib/supabase/server'
import TeamClient from '@/components/team/TeamClient'
export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentProfile } = await supabase
    .from('profiles').select('role').eq('id', user?.id ?? '').single()

  const { data: team } = await supabase
    .from('profiles')
    .select('*, creator:profiles!profiles_created_by_fkey(full_name)')
    .order('created_at', { ascending: true })

  return (
    <TeamClient
      team={team ?? []}
      currentUserId={user?.id ?? ''}
      currentRole={currentProfile?.role ?? 'staff'}
    />
  )
}
