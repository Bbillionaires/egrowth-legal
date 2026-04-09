import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const admin = createServiceClient()
  console.log('Service key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!currentProfile || !['master', 'admin'].includes(currentProfile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await request.json()
  const { data, error } = await admin
    .from('profiles')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  console.log('Update result:', JSON.stringify({ data, error }))
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ profile: data })
}