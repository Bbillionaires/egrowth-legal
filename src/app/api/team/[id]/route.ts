import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

const EDITABLE_FIELDS = ['full_name', 'phone', 'is_active', 'role'] as const

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const admin = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!currentProfile || !['master', 'admin'].includes(currentProfile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Same role rules as creating a member: master manages admins and below, admin manages staff and below
  const manageable = currentProfile.role === 'master'
    ? ['admin', 'staff', 'notary', 'client']
    : ['staff', 'notary', 'client']

  const { data: target } = await admin
    .from('profiles').select('role').eq('id', params.id).single()
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!manageable.includes(target.role)) {
    return NextResponse.json({ error: 'Cannot modify this member' }, { status: 403 })
  }

  const body = await request.json()
  const update: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field]
  }
  if ('role' in update && !manageable.includes(update.role as string)) {
    return NextResponse.json({ error: 'Cannot assign this role' }, { status: 403 })
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('profiles')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ profile: data })
}
