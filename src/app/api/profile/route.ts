import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

// profiles is read-only from the browser, so users update their own name and phone here
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const admin = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { full_name, phone } = await request.json()
  if (typeof full_name !== 'string' || (phone != null && typeof phone !== 'string')) {
    return NextResponse.json({ error: 'Invalid profile details' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('profiles')
    .update({ full_name, phone: phone || null })
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ profile: data })
}
