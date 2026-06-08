'use server'

import { getServiceClient } from './supabase'
import type { ActionResult } from './actions'

type PreviewDraftInput = {
  token?: string | null
  contentType: 'post' | 'city' | 'service' | 'city_service_page' | 'location_service'
  sourceTable: string
  sourceId: string
  sourceSlug?: string | null
  publicPath: string
  payload: Record<string, unknown>
  imageSettings?: Record<string, unknown>
}

const TABLE_WHITELIST = new Set(['posts', 'cities', 'services', 'city_service_pages', 'location_services'])

export async function upsertPreviewDraft(input: PreviewDraftInput): Promise<ActionResult & { token?: string; previewPath?: string }> {
  const sb = getServiceClient()
  const patch = {
    content_type: input.contentType,
    source_table: input.sourceTable,
    source_id: input.sourceId,
    source_slug: input.sourceSlug ?? null,
    public_path: input.publicPath,
    payload: input.payload ?? {},
    image_settings: input.imageSettings ?? {},
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }

  const query = input.token
    ? sb.from('preview_drafts').update(patch).eq('token', input.token).select('token').single()
    : sb.from('preview_drafts').insert(patch).select('token').single()

  const { data, error } = await query
  if (error || !data) return { success: false, error: error?.message ?? 'Could not create preview draft' }
  return { success: true, message: 'Preview draft synced', token: data.token, previewPath: '/admin-preview/' + data.token }
}

export async function publishPreviewDraft(token: string): Promise<ActionResult> {
  const sb = getServiceClient()
  const { data: draft, error: draftError } = await sb.from('preview_drafts').select('*').eq('token', token).single()
  if (draftError || !draft) return { success: false, error: draftError?.message ?? 'Preview draft not found' }
  if (!TABLE_WHITELIST.has(String(draft.source_table))) return { success: false, error: 'Blocked unknown source table' }

  const payload = draft.payload && typeof draft.payload === 'object' ? draft.payload as Record<string, unknown> : {}
  const { error } = await sb
    .from(String(draft.source_table))
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', draft.source_id)

  if (error) return { success: false, error: error.message }
  await sb.from('preview_drafts').delete().eq('token', token)
  return { success: true, message: 'Draft published to live database.' }
}
