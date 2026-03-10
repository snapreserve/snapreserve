import { getUserSession } from '@/lib/get-user-session'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request) {
  const { user } = await getUserSession()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || typeof file === 'string') {
    return Response.json({ error: 'No file provided.' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: 'Only JPG, PNG, WEBP, or PDF files are accepted.' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: 'File must be under 10MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop().toLowerCase()
  const filename = `${user.id}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from('guest-id-documents')
    .upload(filename, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('[upload-document] storage error:', uploadError)
    return Response.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  // Store path and mark as pending review
  const { error: updateError } = await admin
    .from('users')
    .update({
      id_document_url: filename,
      verification_status: 'pending_review',
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('[upload-document] db update error:', updateError)
    return Response.json({ error: 'File uploaded but failed to save record.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
