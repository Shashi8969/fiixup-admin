import { NextRequest, NextResponse } from 'next/server'
import { generateTarget } from '@/lib/image-factory/generate'
import type { ImageFactoryTarget } from '@/lib/image-factory/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ALLOWED = new Map<string, { targetField: string; altField: string }>([
  ['cities',               { targetField: 'hero_image_url', altField: 'hero_image_alt' }],
  ['areas',                { targetField: 'hero_image_url', altField: 'hero_image_alt' }],
  ['services',             { targetField: 'image_url',      altField: 'image_alt' }],
  ['location_services',    { targetField: 'hero_image_url', altField: 'hero_image_alt' }],
  ['global_service_pages', { targetField: 'hero_image_url', altField: 'hero_image_alt' }],
  ['city_service_pages',   { targetField: 'hero_image_url', altField: 'hero_image_alt' }],
  ['posts',                { targetField: 'image',          altField: 'image_alt' }],
])

function validTarget(value: unknown): value is ImageFactoryTarget {
  if (!value || typeof value !== 'object') return false
  const target = value as Record<string, unknown>
  const table = typeof target.table === 'string' ? target.table : ''
  const allowed = ALLOWED.get(table)
  if (!allowed) return false
  if (target.id === undefined || target.id === null) return false
  if (typeof target.key !== 'string' || typeof target.slug !== 'string' || typeof target.title !== 'string') return false
  if (target.targetField !== allowed.targetField || target.altField !== allowed.altField) return false
  if (!['hero', 'cover', 'section'].includes(String(target.variant))) return false
  if (target.variant === 'section' && table !== 'posts') return false
  return true
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { target?: unknown }
    if (!validTarget(body.target)) {
      return NextResponse.json({ error: 'Invalid image target' }, { status: 400 })
    }

    const result = await generateTarget(body.target)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('[image-factory] generate failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image generation failed' },
      { status: 500 },
    )
  }
}
