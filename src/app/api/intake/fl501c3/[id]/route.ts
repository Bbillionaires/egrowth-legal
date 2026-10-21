import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ANSWERS_KEY, emptyPayload, prepareForSave } from '@/lib/intake/fl501c3/payload'
import { SECTIONS, type Section, validateIntake } from '@/lib/intake/fl501c3/validate'

const STAFF_ROLES = ['master', 'admin', 'staff']
const MAX_PAYLOAD_BYTES = 512 * 1024

// Loads the interview with the caller's own client so RLS decides who may see it
async function loadInterview(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const [{ data: profile }, { data: interview }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('interviews').select('id, service_type, status, current_step, answers').eq('id', id).maybeSingle(),
  ])
  if (!interview || interview.service_type !== 'nonprofit') {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }
  return { interview, role: profile?.role as string | undefined, isStaff: !!profile && STAFF_ROLES.includes(profile.role) }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const loaded = await loadInterview(params.id)
  if ('error' in loaded) return loaded.error
  const { interview } = loaded

  return NextResponse.json({
    payload: interview.answers?.[ANSWERS_KEY] ?? emptyPayload(),
    status: interview.status,
    current_step: interview.current_step,
  })
}

// Body: { action: 'save' | 'submit', payload, step?, sections? }
// save   — stores a draft; with sections, also reports whether those sections are complete
// submit — requires the full payload to pass final validation, then completes the interview
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const loaded = await loadInterview(params.id)
  if ('error' in loaded) return loaded.error
  const { interview, role, isStaff } = loaded

  // Notaries can view interviews (RLS) but only staff and the client fill in the intake
  if (!isStaff && role !== 'client') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }
  if (interview.status === 'completed' && !isStaff) {
    return NextResponse.json({ error: 'This intake has been submitted and can no longer be changed.' }, { status: 409 })
  }

  const raw = await request.text()
  if (raw.length > MAX_PAYLOAD_BYTES) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  let body: any
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { action, step } = body ?? {}
  // Drop answers to hidden questions and rebuild the unknown markers before validating
  const payload = body?.payload && typeof body.payload === 'object' && body.payload.answers && typeof body.payload.answers === 'object'
    ? prepareForSave(body.payload)
    : body?.payload
  if (action !== 'save' && action !== 'submit') {
    return NextResponse.json({ error: "action must be 'save' or 'submit'" }, { status: 400 })
  }
  if (step !== undefined && !(Number.isInteger(step) && step >= 1 && step <= 10)) {
    return NextResponse.json({ error: 'step must be a whole number from 1 to 10' }, { status: 400 })
  }
  const sections: Section[] | undefined = Array.isArray(body.sections)
    ? body.sections.filter((s: unknown): s is Section => SECTIONS.includes(s as Section))
    : undefined

  const result = validateIntake(payload, { mode: action === 'submit' ? 'final' : 'draft' })
  if (!result.ok) return NextResponse.json({ errors: result.errors, warnings: result.warnings }, { status: 422 })

  const update: Record<string, unknown> = {
    answers: { ...(interview.answers ?? {}), [ANSWERS_KEY]: payload },
    current_step: step ?? interview.current_step,
  }
  if (action === 'submit') {
    update.status = 'completed'
    update.completed_at = new Date().toISOString()
  }

  const { error } = await createServiceClient().from('interviews').update(update).eq('id', interview.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const stepResult = action === 'save' && sections?.length
    ? validateIntake(payload, { mode: 'final', sections })
    : undefined

  return NextResponse.json({
    saved: true,
    payload,
    status: action === 'submit' ? 'completed' : interview.status,
    warnings: result.warnings,
    ...(stepResult && { step: { complete: stepResult.ok, errors: stepResult.errors, warnings: stepResult.warnings } }),
  })
}
