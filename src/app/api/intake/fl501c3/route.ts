import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ANSWERS_KEY, emptyPayload } from '@/lib/intake/fl501c3/payload'

const STAFF_ROLES = ['master', 'admin', 'staff']

// Opens the client's Florida 501(c)(3) intake, creating it on first use.
// Staff pass client_id; clients always get their own.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isStaff = !!profile && STAFF_ROLES.includes(profile.role)

  let clientId: string | null = null
  if (isStaff) {
    const body = await request.json().catch(() => ({}))
    clientId = typeof body.client_id === 'string' ? body.client_id : null
    if (!clientId) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    const { data: client } = await admin.from('clients').select('id').eq('id', clientId).single()
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  } else {
    const { data: client } = await admin.from('clients').select('id').eq('profile_id', user.id).limit(1).maybeSingle()
    if (!client) return NextResponse.json({ error: 'No client record for this account' }, { status: 404 })
    clientId = client.id
  }

  // One nonprofit interview per client (interviews_client_service_unique)
  const { data: existing } = await admin
    .from('interviews').select('id').eq('client_id', clientId).eq('service_type', 'nonprofit').maybeSingle()
  if (existing) return NextResponse.json({ interview_id: existing.id })

  const { data: created, error } = await admin.from('interviews').insert({
    client_id: clientId,
    service_type: 'nonprofit',
    status: 'in_progress',
    current_step: 1,
    total_steps: 10,
    answers: { [ANSWERS_KEY]: emptyPayload() },
    started_by: user.id,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ interview_id: created.id }, { status: 201 })
}
