// utils/seo/pageScore.ts
// RankMath/Yoast-style weighted SEO checklist scorer. Pure function — no
// React/Supabase imports — so it can be unit-tested and reused later by an
// inline per-editor score widget without any refactor.

import { META_LIMITS, getMetaStatus } from '@/utils/seo/metaMetrics'
import type { SeoPageRow, PageSignals } from '@/utils/seo/pageSignals'

export type CheckStatus = 'pass' | 'warn' | 'fail'
export type CheckGroup = 'critical' | 'quality' | 'social' | 'content' | 'minor'

export type SeoCheck = {
  id: string
  label: string
  group: CheckGroup
  weight: number
  status: CheckStatus
  message: string
}

export type Grade = 'A' | 'B' | 'C' | 'D'

export type PageScoreResult = {
  score: number
  grade: Grade
  checks: SeoCheck[]
  failCount: number
  warnCount: number
}

export function gradeFor(score: number): Grade {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}

export function scorePage(row: SeoPageRow, signals: PageSignals): PageScoreResult {
  const title = (row.meta_title ?? '').trim()
  const description = (row.meta_description ?? '').trim()
  const checks: SeoCheck[] = []

  // ── Critical ──────────────────────────────────────────────────────────────
  checks.push({
    id: 'title_present', group: 'critical', weight: 10, label: 'Meta title is set',
    status: title ? 'pass' : 'fail',
    message: title ? 'Meta title is set.' : 'Missing meta title — every page needs one.',
  })
  checks.push({
    id: 'description_present', group: 'critical', weight: 10, label: 'Meta description is set',
    status: description ? 'pass' : 'fail',
    message: description ? 'Meta description is set.' : 'Missing meta description.',
  })
  checks.push({
    id: 'indexable', group: 'critical', weight: 15, label: 'Page is indexable',
    status: signals.isIndexable ? 'pass' : 'fail',
    message: signals.isIndexable ? 'Page is active and indexed.' : 'Page is inactive or set to noindex — it will not rank.',
  })
  checks.push({
    id: 'canonical_present', group: 'critical', weight: 5, label: 'Canonical URL is set',
    status: (row.canonical_url ?? '').trim() ? 'pass' : 'warn',
    message: (row.canonical_url ?? '').trim() ? 'Canonical URL is set.' : 'No canonical URL — recommended to avoid duplicate-content issues.',
  })

  // ── Title / description quality ──────────────────────────────────────────
  if (title) {
    const status = getMetaStatus(title, 'title')
    checks.push({
      id: 'title_length', group: 'quality', weight: 8, label: 'Title length is ideal',
      status: status === 'good' ? 'pass' : status === 'over' ? 'fail' : 'warn',
      message: `${title.length} characters — ideal is ${META_LIMITS.title.idealMin}-${META_LIMITS.title.idealMax}.`,
    })
  }
  if (description) {
    const status = getMetaStatus(description, 'description')
    checks.push({
      id: 'description_length', group: 'quality', weight: 8, label: 'Description length is ideal',
      status: status === 'good' ? 'pass' : status === 'over' ? 'fail' : 'warn',
      message: `${description.length} characters — ideal is ${META_LIMITS.description.idealMin}-${META_LIMITS.description.idealMax}.`,
    })
  }

  // ── Social / structured data ─────────────────────────────────────────────
  checks.push({
    id: 'og_image', group: 'social', weight: 6, label: 'Open Graph image is set',
    status: signals.hasOgImage ? 'pass' : 'fail',
    message: signals.hasOgImage ? 'OG image is set.' : 'No OG image — social shares will look empty.',
  })
  if (signals.hasOgImage) {
    checks.push({
      id: 'og_dimensions', group: 'social', weight: 2, label: 'OG image has explicit dimensions',
      status: signals.hasOgDimensions ? 'pass' : 'warn',
      message: signals.hasOgDimensions ? 'OG image width/height are set.' : 'OG image width/height are missing.',
    })
  }
  checks.push({
    id: 'schema_present', group: 'social', weight: 8, label: 'Structured data (schema.org) is present',
    status: signals.hasSchema ? 'pass' : 'fail',
    message: signals.hasSchema ? `${signals.schemaTypeCount} schema type(s) present.` : 'No schema.org markup — missing rich-result eligibility.',
  })

  // ── Content ───────────────────────────────────────────────────────────────
  const wc = signals.bodyWordCount
  checks.push({
    id: 'content_depth', group: 'content', weight: 12, label: 'Content length',
    status: wc >= 600 ? 'pass' : wc >= 300 ? 'warn' : 'fail',
    message: `${wc} words of body content${wc < 300 ? ' — thin content, aim for 600+' : wc < 600 ? ' — acceptable, 600+ is stronger' : ' — good depth'}.`,
  })
  checks.push({
    id: 'has_faqs', group: 'content', weight: 5, label: 'FAQ content present',
    status: signals.faqCount > 0 ? 'pass' : 'warn',
    message: signals.faqCount > 0 ? `${signals.faqCount} FAQ item(s) — good for FAQ rich results.` : 'No FAQ content on this page.',
  })
  checks.push({
    id: 'internal_links', group: 'content', weight: 6, label: 'Internal linking',
    status: signals.internalLinkCount >= 3 ? 'pass' : signals.internalLinkCount >= 1 ? 'warn' : 'fail',
    message: `${signals.internalLinkCount} internal link(s) found.`,
  })
  checks.push({
    id: 'heading_structure', group: 'content', weight: 4, label: 'Heading structure',
    status: signals.headingCount >= 2 ? 'pass' : signals.headingCount === 1 ? 'warn' : 'fail',
    message: `${signals.headingCount} heading(s)/section(s) detected.`,
  })
  checks.push({
    id: 'image_alt', group: 'content', weight: 4, label: 'Hero image has alt text',
    status: signals.hasImageAlt ? 'pass' : 'warn',
    message: signals.hasImageAlt ? 'Hero image alt text is set.' : 'Hero image alt text is missing.',
  })

  // ── Minor ─────────────────────────────────────────────────────────────────
  checks.push({
    id: 'meta_keywords', group: 'minor', weight: 2, label: 'Meta keywords set',
    status: (row.meta_keywords ?? '').trim() ? 'pass' : 'warn',
    message: (row.meta_keywords ?? '').trim() ? 'Meta keywords set.' : 'No meta keywords (low-impact, optional).',
  })

  const statusWeight: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0 }
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0)
  const earnedWeight = checks.reduce((sum, c) => sum + c.weight * statusWeight[c.status], 0)
  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0

  return {
    score,
    grade: gradeFor(score),
    checks,
    failCount: checks.filter((c) => c.status === 'fail').length,
    warnCount: checks.filter((c) => c.status === 'warn').length,
  }
}
