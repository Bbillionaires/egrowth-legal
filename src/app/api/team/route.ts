import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = await createAdminClient()

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

  // Check if user already exists
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const alreadyExists = existingUsers?.users?.find(u => u.email === email)
  if (alreadyExists) {
    // Just update their profile role instead of re-inviting
    const { data: profile } = await admin
      .from('profiles')
      .update({ full_name, role, phone, created_by: user.id })
      .eq('id', alreadyExists.id)
      .select()
      .single()
    return NextResponse.json({ profile })
  }

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role, phone },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })
  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .update({ full_name, role, phone, created_by: user.id })
    .eq('id', inviteData.user.id)
    .select()
    .single()

  return NextResponse.json({ profile })
}