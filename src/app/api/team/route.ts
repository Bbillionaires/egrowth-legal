import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = createServiceClient()

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
  const alreadyExists = existingUsers?.users?.find((u: any) => u.email === email)
  if (alreadyExists) {
    await admin.from('profiles')
      .update({ full_name, role, phone, created_by: user.id })
      .eq('id', alreadyExists.id)
    return NextResponse.json({ success: true, userId: alreadyExists.id })
  }

  // Create user with temp password — no email sent
  const tempPassword = 'TempPass1!' + Math.random().toString(36).slice(-6)
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name, role, phone },
  })

  if (createError) {
    console.error('Create error:', JSON.stringify(createError))
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Update profile with correct role
  await admin.from('profiles')
    .update({ full_name, role, phone, created_by: user.id })
    .eq('id', newUser.user.id)

  return NextResponse.json({ 
    success: true, 
    userId: newUser.user.id,
    tempPassword,
    message: 'User created. Share the temporary password with them to log in.'
  })
}