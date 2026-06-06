import type { SchemaEntityType, SchemaPageKind } from '@/utils/schema/schemaTypes'

export type SchemaBuildInput = {
  kind: SchemaPageKind
  record: Record<string, unknown>
  selectedTypes: SchemaEntityType[]
  urlPath: string
  faqs?: Record<string, unknown>[]
  blocks?: Record<string, unknown>[]
  overrides?: Record<string, unknown>
}

const SITE = 'https://fiixup.in'
const PHONE = '+918197459732'

function s(value: unknown) {
  return String(value ?? '').trim()
}

function titleCaseSlug(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function absoluteUrl(urlPath: string) {
  if (urlPath.startsWith('http')) return urlPath
  return `${SITE}/${urlPath.replace(/^\/+/, '')}`
}

function getName(record: Record<string, unknown>) {
  return s(record.service_name) || s(record.title) || s(record.name) || s(record.hero_heading) || s(record.meta_title) || 'Fiixup'
}

function getDescription(record: Record<string, unknown>) {
  return s(record.meta_description) || s(record.description) || s(record.hero_subheading) || s(record.about_para1) || s(record.seo_intro_body)
}

function extractFaqs(faqs: Record<string, unknown>[] = [], blocks: Record<string, unknown>[] = []) {
  const rows = faqs
    .map(f => ({ question: s(f.question), answer: s(f.answer) }))
    .filter(f => f.question && f.answer)

  const blockFaqs = blocks.flatMap(block => {
    if (s(block.type) !== 'faq') return []
    const items = Array.isArray(block.items) ? block.items : []
    return items.map(item => {
      const row = item as Record<string, unknown>
      return { question: s(row.question) || s(row.q), answer: s(row.answer) || s(row.a) }
    })
  }).filter(f => f.question && f.answer)

  return [...rows, ...blockFaqs]
}

function extractSteps(blocks: Record<string, unknown>[] = []) {
  return blocks.flatMap(block => {
    if (s(block.type) !== 'steps') return []
    const items = Array.isArray(block.items) ? block.items : []
    return items.map((item, index) => {
      const row = item as Record<string, unknown>
      return {
        '@type': 'HowToStep',
        position: index + 1,
        name: s(row.title) || s(row.heading) || `Step ${index + 1}`,
        text: s(row.text) || s(row.description) || s(row.desc),
      }
    })
  }).filter(step => step.text)
}

export function buildSchemaGraph(input: SchemaBuildInput) {
  const { kind, record, selectedTypes, urlPath, faqs = [], blocks = [], overrides = {} } = input
  const url = absoluteUrl(urlPath || s(record.canonical_url))
  const name = s(overrides.name) || getName(record)
  const description = s(overrides.description) || getDescription(record)
  const citySlug = s(record.city_slug) || s(record.slug)
  const areaSlug = s(record.area_slug)
  const rating = Number(record.schema_aggregate_rating ?? record.schema_rating ?? 4.9)
  const reviewCount = Number(record.schema_review_count ?? record.review_count ?? 150)
  const graph: Record<string, unknown>[] = []

  for (const type of selectedTypes) {
    if (type === 'WebPage') {
      graph.push({
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name,
        description,
        isPartOf: { '@id': `${SITE}#website` },
        about: { '@id': `${SITE}#organization` },
      })
    }

    if (type === 'Organization') {
      graph.push({
        '@type': 'Organization',
        '@id': `${SITE}#organization`,
        name: 'Fiixup',
        url: SITE,
        telephone: PHONE,
        logo: s(overrides.logo) || `${SITE}/logo.png`,
        sameAs: [],
      })
    }

    if (type === 'LocalBusiness') {
      graph.push({
        '@type': 'LocalBusiness',
        '@id': `${SITE}#localbusiness`,
        name: 'Fiixup',
        url: SITE,
        telephone: PHONE,
        priceRange: '₹₹',
        areaServed: citySlug ? { '@type': 'City', name: titleCaseSlug(citySlug) } : 'Bangalore',
        address: {
          '@type': 'PostalAddress',
          addressLocality: citySlug ? titleCaseSlug(citySlug) : 'Bangalore',
          addressRegion: s(record.state) || 'Karnataka',
          postalCode: s(record.postal_code) || undefined,
          addressCountry: 'IN',
        },
      })
    }

    if (type === 'Service') {
      graph.push({
        '@type': 'Service',
        '@id': `${url}#service`,
        name,
        description,
        url,
        provider: { '@id': `${SITE}#localbusiness` },
        areaServed: citySlug ? { '@type': 'City', name: titleCaseSlug(citySlug) } : 'Bangalore',
        serviceType: s(record.service_category) || s(record.category) || kind,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
          url,
        },
      })
    }

    if (type === 'BreadcrumbList') {
      const pathParts = url.replace(SITE, '').split('/').filter(Boolean)
      graph.push({
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
          ...pathParts.map((part, index) => ({
            '@type': 'ListItem',
            position: index + 2,
            name: titleCaseSlug(part),
            item: `${SITE}/${pathParts.slice(0, index + 1).join('/')}`,
          })),
        ],
      })
    }

    if (type === 'FAQPage') {
      const items = extractFaqs(faqs, blocks)
      if (items.length) {
        graph.push({
          '@type': 'FAQPage',
          '@id': `${url}#faq`,
          mainEntity: items.map(item => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        })
      }
    }

    if (type === 'AggregateRating') {
      graph.push({
        '@type': 'AggregateRating',
        itemReviewed: { '@type': 'Service', name },
        ratingValue: rating || 4.9,
        reviewCount: reviewCount || 150,
        bestRating: 5,
        worstRating: 1,
      })
    }

    if (type === 'Article' || type === 'BlogPosting') {
      graph.push({
        '@type': type,
        '@id': `${url}#article`,
        headline: s(overrides.headline) || s(record.meta_title) || name,
        description,
        image: s(record.og_image_url) || s(record.image_url) || undefined,
        datePublished: s(record.date_proper) || s(record.created_at) || undefined,
        dateModified: s(record.updated_at) || undefined,
        author: { '@type': 'Organization', name: 'Fiixup' },
        publisher: { '@id': `${SITE}#organization` },
        mainEntityOfPage: { '@id': `${url}#webpage` },
      })
    }

    if (type === 'HowTo') {
      const steps = extractSteps(blocks)
      if (steps.length) {
        graph.push({
          '@type': 'HowTo',
          '@id': `${url}#howto`,
          name: s(overrides.howToName) || name,
          description,
          totalTime: s(overrides.totalTime) || undefined,
          estimatedCost: s(overrides.estimatedCost)
            ? { '@type': 'MonetaryAmount', currency: 'INR', value: s(overrides.estimatedCost) }
            : undefined,
          step: steps,
        })
      }
    }
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph.filter(Boolean),
  }
}
