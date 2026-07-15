import { createClient } from '@/lib/supabase/server'
import NotaryClient from '@/components/notary/NotaryClient'

export default async function NotaryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Items ready for notarization: status 'approved', OR assigned to this notary
  const { data: queueItems } = await supabase
    .from('submission_queue')
    .select(`
      *,
      client:clients(id, full_name, email),
      document:documents(id, name, document_type, service_type, notarized_by, notarized_path),
      assignee:profiles!submission_queue_assigned_to_fkey(id, full_name, role)
    `)
    .or(`status.eq.approved,assigned_to.eq.${user?.id ?? 'none'}`)
    .order('priority', { ascending: true })
    .order('updated_at', { ascending: false })

  return <NotaryClient initialItems={queueItems ?? []} currentUserId={user?.id ?? ''} />
}
