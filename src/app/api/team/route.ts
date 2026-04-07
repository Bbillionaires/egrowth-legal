import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!currentProfile || !['master', 'admin'].includes(currentProfile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { email, full_name, role, phone } = await request.json()

  const allowedByMaster = ['admin', 'staff', 'notary', 'client']
  const allowedByAdmin = ['staff', 'notary', 'client']
  const allowed = currentProfile.role === 'master' ? allowedByMaster : allowedByAdmin
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: 'Cannot create this role' }, { status: 403 })
  }

  const { data, error } = await supabase.rpc('create_team_member', {
    p_email: email,
    p_full_name: full_name,
    p_role: role,
    p_phone: phone ?? null,
    p_created_by: user.id,
  })

  if (error) {
    console.error('Create team member error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, userId: data })
}