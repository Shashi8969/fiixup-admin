import { NextRequest, NextResponse } from 'next/server'
import { discoverImageTargets } from '@/lib/image-factory/discover'
import { generateTarget } from '@/lib/image-factory/generate'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorized(request: NextRequest) {
  const secret = process.env.IMAGE_FACTORY_CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Math.max(1, Math.min(3, Number(request.nextUrl.searchParams.get('limit') ?? 1)))
  const targets = await discoverImageTargets({ blogSectionImages: 4 })
  const batch = targets.slice(0, limit)
  const completed: Array<{ key: string; url: string }> = []
  const failed: Array<{ key: string; error: string }> = []

  for (const target of batch) {
    try {
      const result = await generateTarget(target)
      completed.push({ key: target.key, url: result.publicUrl })
    } catch (error) {
      failed.push({
        key: target.key,
        error: error instanceof Error ? error.message : 'Generation failed',
      })
    }
  }

  return NextResponse.json({
    scanned: targets.length,
    attempted: batch.length,
    completed,
    failed,
    remainingEstimate: Math.max(0, targets.length - completed.length),
  })
}
