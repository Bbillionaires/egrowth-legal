import { createClient } from '@/lib/supabase/server'
import QueueClient from '@/components/queue/QueueClient'

export default async function QueuePage() {
  const supabase = await createClient()

  const { data: queueItems } = await supabase
    .from('submission_queue')
    .select(`
      *,
      client:clients(id, full_name, email, state),
      document:documents(id, name, document_type, service_type, storage_path),
      assignee:profiles!submission_queue_assigned_to_fkey(id, full_name, role)
    `)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })

  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['admin', 'staff', 'notary'])
    .eq('is_active', true)

  return <QueueClient initialItems={queueItems ?? []} staff={staff ?? []} />
}
