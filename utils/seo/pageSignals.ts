// utils/seo/pageSignals.ts
// Normalizes a `seo_pages` row into page-type-agnostic content/meta signals
// that utils/seo/pageScore.ts scores. seo_pages holds every page type
// (home/city_hub/area_service/city_service/city_service_category/post) with
// two different `page_data` shapes:
//  - post: { content: Block[] (same shape as components/posts/editor/types),
//            excerpt, internalLinks, relatedServices, imageAlt, ... }
//  - everything else: structured fields (heroHeading, aboutPara1/2,
//            seoIntroBody, seoConclusion, seoSections[], faqs[],
//            whyChoosePoints[], serviceHighlights[], heroImageAlt, ...)
// Confirmed directly against production data (not guessed) before writing this.

export type SeoPageRow = {
  id: number
  url_path: string | null
  page_type: string | null
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string | null
  canonical_url: string | null
  og_image_url: string | null
  og_image_width: number | null
  og_image_height: number | null
  schema_json: unknown
  page_data: unknown
  internal_links_json: unknown
  related_services_json: unknown
  nearby_areas_json: unknown
  is_active: boolean | null
  is_indexed: boolean | null
  post_id: string | null
  location_service_id: number | null
  service_id: string | null
  city_id: string | null
  city_service_page_id: string | null
  area_id: number | null
  updated_at: string | null
}

export type PageSignals = {
  bodyWordCount: number
  headingCount: number
  faqCount: number
  internalLinkCount: number
  hasImageAlt: boolean
  hasOgImage: boolean
  hasOgDimensions: boolean
  hasSchema: boolean
  schemaTypeCount: number
  isIndexable: boolean
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ')
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// Recursively collects every "sentence-like" string in a JSON value (>= 3
// words), skipping slugs/ids/single-word labels/booleans-as-strings. This
// lets one function extract body text from both page_data shapes (post
// blocks vs. structured service-page fields) without hand-listing every key
// — and it keeps working if new page_data keys get added later.
function collectBodyText(value: unknown, depth = 0): string {
  if (depth > 6) return ''
  if (typeof value === 'string') {
    const text = stripHtml(value).trim()
    return wordCount(text) >= 3 ? text : ''
  }
  if (Array.isArray(value)) {
    return value.map((v) => collectBodyText(v, depth + 1)).filter(Boolean).join(' ')
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).map((v) => collectBodyText(v, depth + 1)).filter(Boolean).join(' ')
  }
  return ''
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? stripHtml(value).trim() : ''
}

function arrLen(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

export function extractPageSignals(row: SeoPageRow): PageSignals {
  const pageData = (row.page_data && typeof row.page_data === 'object' ? row.page_data : {}) as Record<string, unknown>
  const isPost = row.page_type === 'post'
  const blocks = isPost && Array.isArray(pageData.content) ? (pageData.content as Record<string, unknown>[]) : []

  const bodyWordCount = wordCount(collectBodyText(isPost ? { content: blocks, excerpt: pageData.excerpt } : pageData))

  const headingCount = isPost
    ? blocks.filter((b) => b.type === 'heading').length
    : ['heroHeading', 'aboutHeading', 'seoIntroHeading', 'locationHeading'].filter((k) => textOf(pageData[k])).length
      + arrLen(pageData.seoSections)

  const faqCount = isPost
    ? blocks.filter((b) => b.type === 'faq').reduce((n, b) => n + arrLen(b.items), 0)
    : arrLen(pageData.faqs)

  const internalLinkCount =
    arrLen(row.internal_links_json) +
    arrLen(row.related_services_json) +
    arrLen(row.nearby_areas_json) +
    (isPost ? arrLen(pageData.internalLinks) + arrLen(pageData.relatedServices) : 0)

  const hasImageAlt = Boolean(textOf(pageData.heroImageAlt) || textOf(pageData.imageAlt))

  const schemaJson = row.schema_json && typeof row.schema_json === 'object' ? row.schema_json as Record<string, unknown> : null
  const graph = schemaJson && Array.isArray(schemaJson['@graph']) ? schemaJson['@graph'] as unknown[] : null
  const schemaTypeCount = graph ? graph.length : (schemaJson ? Object.keys(schemaJson).length : 0)

  return {
    bodyWordCount,
    headingCount,
    faqCount,
    internalLinkCount,
    hasImageAlt,
    hasOgImage: Boolean(textOf(row.og_image_url)),
    hasOgDimensions: Boolean(row.og_image_width && row.og_image_height),
    hasSchema: schemaTypeCount > 0,
    schemaTypeCount,
    isIndexable: row.is_active !== false && row.is_indexed !== false,
  }
}
