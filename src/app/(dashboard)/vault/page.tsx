export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import VaultClient from '@/components/vault/VaultClient'

export default async function VaultPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, email, state')
    .eq('is_active', true)
    .order('full_name')

  const { data: documents } = await supabase
    .from('documents')
    .select('*, client:clients(full_name)')
    .order('created_at', { ascending: false })

  return <VaultClient clients={clients ?? []} documents={documents ?? []} />
}
