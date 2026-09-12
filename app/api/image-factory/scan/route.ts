import { NextRequest, NextResponse } from 'next/server'
import { discoverImageTargets } from '@/lib/image-factory/discover'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sections = Math.max(0, Math.min(5, Number(request.nextUrl.searchParams.get('sections') ?? 4)))
    const includeComplete = request.nextUrl.searchParams.get('complete') === '1'
    const targets = await discoverImageTargets({
      includeComplete,
      blogSectionImages: sections,
    })

    const byTable: Record<string, number> = {}
    const byVariant: Record<string, number> = {}
    for (const target of targets) {
      byTable[target.table] = (byTable[target.table] ?? 0) + 1
      byVariant[target.variant] = (byVariant[target.variant] ?? 0) + 1
    }

    return NextResponse.json({
      targets,
      total: targets.length,
      byTable,
      byVariant,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image scan failed' },
      { status: 500 },
    )
  }
}
