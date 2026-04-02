import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDocuments } from '@/lib/utils/docGenerator'
import { ServiceType } from '@/lib/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { interviewId, clientId, serviceType, answers, documentTypes } = await request.json()

  // Generate DOCX files
  const generated = await generateDocuments(serviceType as ServiceType, answers, documentTypes)

  const savedDocs = []

  for (const doc of generated) {
    const storagePath = `${clientId}/${Date.now()}_${doc.name}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, doc.buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      continue
    }

    // Save document record
    const { data: docRecord } = await supabase.from('documents').insert({
      client_id: clientId,
      interview_id: interviewId,
      name: doc.name,
      document_type: doc.documentType,
      service_type: serviceType,
      status: 'queued',
      storage_path: storagePath,
      is_trustee_file: answers.use_egrowth_trustee === true,
      generated_by: user.id,
    }).select().single()

    if (docRecord) {
      // Add to submission queue
      await supabase.from('submission_queue').insert({
        document_id: docRecord.id,
        client_id: clientId,
        filing_state: answers.state,
        priority: 3,
      })
      savedDocs.push(docRecord)
    }
  }

  // Mark interview complete
  if (interviewId) {
    await supabase.from('interviews').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', interviewId)
  }

  // If trustee service, create trustee account
  if (answers.use_egrowth_trustee && clientId) {
    await supabase.from('trustee_accounts').insert({
      client_id: clientId,
      trust_name: answers.trust_name ?? 'Client Trust',
      trust_type: answers.trust_type ?? 'Revocable Living Trust',
      fee_type: 'both',
      flat_fee_cents: 50000,
      fee_percentage: 0.0150,
      billing_cycle: 'annual',
      next_billing: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    })
  }

  return NextResponse.json({ documents: savedDocs, count: savedDocs.length })
}
