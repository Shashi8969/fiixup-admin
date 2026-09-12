import 'server-only'

import { getImageFactoryClient } from './client'
import type { ImageFactoryTarget } from './types'

type Row = Record<string, unknown>

const SOURCES: Array<{
  table: ImageFactoryTarget['table']
  targetField: ImageFactoryTarget['targetField']
  altField: ImageFactoryTarget['altField']
}> = [
  { table: 'cities',               targetField: 'hero_image_url', altField: 'hero_image_alt' },
  { table: 'services',             targetField: 'image_url',      altField: 'image_alt' },
  { table: 'location_services',    targetField: 'hero_image_url', altField: 'hero_image_alt' },
  { table: 'global_service_pages', targetField: 'hero_image_url', altField: 'hero_image_alt' },
  { table: 'city_service_pages',   targetField: 'hero_image_url', altField: 'hero_image_alt' },
  { table: 'posts',                targetField: 'image',          altField: 'image_alt' },
]

const DEFAULT_HINTS = [
  '/default', 'default-', 'placeholder', 'fallback',
  'og-image.webp', 'hero.webp', 'hero.jpg', 'hero.png',
]

function text(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function looksDefault(url?: string | null) {
  if (!url) return true
  const lower = url.toLowerCase()
  return DEFAULT_HINTS.some(h => lower.includes(h))
}

function sectionImageCount(content: unknown) {
  if (!Array.isArray(content)) return 0
  return content.filter(block => {
    if (!block || typeof block !== 'object') return false
    const row = block as Row
    return row.type === 'image' && row.source === 'fiixup-image-factory'
  }).length
}

function headings(content: unknown) {
  if (!Array.isArray(content)) return [] as Array<{ heading: string; index: number }>
  const result: Array<{ heading: string; index: number }> = []
  content.forEach((block, index) => {
    if (!block || typeof block !== 'object') return
    const row = block as Row
    if (row.type !== 'heading') return
    const level = Number(row.level ?? 2)
    const heading = text(row, 'content', 'heading', 'title')
    if (heading && level >= 2 && level <= 3) result.push({ heading, index })
  })
  return result
}

function baseTarget(
  source: (typeof SOURCES)[number],
  row: Row,
): ImageFactoryTarget | null {
  if (row.id === undefined || row.id === null) return null
  // Some CMS page types do not yet expose a hero image column. Skip them safely
  // instead of creating a job that would fail when it tries to update the row.
  if (!Object.prototype.hasOwnProperty.call(row, source.targetField)) return null

  const slug = text(row, 'slug', 'service_slug', 'city_slug') || String(row.id)
  const title = text(row, 'hero_heading', 'title', 'service_name', 'name', 'meta_title') || slug
  const current = typeof row[source.targetField] === 'string' ? String(row[source.targetField]) : null

  return {
    key: `${source.table}:${String(row.id)}:${source.table === 'posts' ? 'cover' : 'hero'}`,
    table: source.table,
    id: row.id as string | number,
    slug,
    title,
    city: source.table === 'cities' ? text(row, 'name') : text(row, 'city_name', 'city_slug'),
    area: text(row, 'area_name', 'area_slug'),
    service: text(row, 'service_name', 'short_title', 'title'),
    category: text(row, 'service_category', 'category'),
    currentImage: current,
    targetField: source.targetField,
    altField: source.altField,
    variant: source.table === 'posts' ? 'cover' : 'hero',
  }
}

export async function discoverImageTargets(options?: {
  includeComplete?: boolean
  blogSectionImages?: number
}) {
  const sb = await getImageFactoryClient()
  const blogSectionImages = Math.max(0, Math.min(5, options?.blogSectionImages ?? 4))
  const rows: Array<{ target: ImageFactoryTarget; row: Row }> = []

  for (const source of SOURCES) {
    const { data, error } = await sb.from(source.table).select('*').limit(1000)
    if (error) {
      console.error(`[image-factory] unable to scan ${source.table}:`, error.message)
      continue
    }
    for (const row of (data ?? []) as Row[]) {
      const target = baseTarget(source, row)
      if (target) rows.push({ target, row })
    }
  }

  const usage = new Map<string, number>()
  rows.forEach(({ target }) => {
    if (!target.currentImage) return
    usage.set(target.currentImage, (usage.get(target.currentImage) ?? 0) + 1)
  })

  const targets: ImageFactoryTarget[] = []
  for (const { target, row } of rows) {
    const duplicated = Boolean(target.currentImage && (usage.get(target.currentImage) ?? 0) > 1)
    if (options?.includeComplete || looksDefault(target.currentImage) || duplicated) {
      targets.push(target)
    }

    if (target.table !== 'posts' || blogSectionImages === 0) continue
    const existing = sectionImageCount(row.content)
    const remaining = Math.max(0, blogSectionImages - existing)
    if (!remaining) continue

    const choices = headings(row.content).slice(0, blogSectionImages)
    choices.slice(0, remaining).forEach(({ heading, index }) => {
      targets.push({
        ...target,
        key: `posts:${String(target.id)}:section:${index}`,
        currentImage: null,
        variant: 'section',
        sectionHeading: heading,
        sectionIndex: index,
      })
    })
  }

  return targets
}
