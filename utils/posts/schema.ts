import type { Block, SchemaType } from '@/components/posts/editor/types'

export function buildJsonLd(
  type: SchemaType,
  post: Record<string, unknown>,
  overrides: Record<string, string>,
  blocks: Block[],
): object | null {
  if (type === 'none') return null

  const siteUrl   = 'https://fiixup.in'
  const postUrl   = `${siteUrl}/blog/${post.slug}`
  const imgUrl    = String(post.image    || `${siteUrl}/assets/og-image.webp`)
  const datePubl  = String(post.date_proper || post.date || new Date().toISOString())
  const headline  = overrides.headline    || String(post.meta_title   || post.title || '')
  const desc      = overrides.description || String(post.meta_description || post.excerpt || '')
  const keywords  = overrides.keywords    || String(post.meta_keywords || '')
  const section   = overrides.articleSection || String(post.category  || 'Automotive')

  const author = {
    '@type': 'Person',
    name:     overrides.authorName || String(post.author      || 'Fiixup Team'),
    jobTitle: overrides.authorRole || String(post.author_role || 'Automotive Expert'),
  }
  const publisher = {
    '@type': 'Organization',
    name:    'Fiixup',
    logo:    { '@type': 'ImageObject', url: `${siteUrl}/assets/logo.png` },
  }

  const faqItems = blocks
    .filter((b) => b.type === 'faq')
    .flatMap((b) => (Array.isArray(b.items) ? b.items : []) as any[])
    .map((item) => ({
      '@type': 'Question',
      name:    String(item.question || ''),
      acceptedAnswer: { '@type': 'Answer', text: String(item.answer || '') },
    }))

  const stepItems = blocks
    .filter((b) => b.type === 'steps')
    .flatMap((b) => (Array.isArray(b.items) ? b.items : []) as any[])
    .map((item, i) => ({
      '@type':    'HowToStep',
      position:   i + 1,
      name:       String(item.title       || ''),
      text:       String(item.description || ''),
    }))

  const base = { '@context': 'https://schema.org', '@type': type }

  switch (type) {
    case 'BlogPosting':
    case 'Article':
    case 'NewsArticle':
      return {
        ...base,
        headline,
        description:      desc,
        url:              postUrl,
        datePublished:    datePubl,
        dateModified:     overrides.dateModified || datePubl,
        author,
        publisher,
        image:            { '@type': 'ImageObject', url: imgUrl },
        keywords,
        articleSection:   section,
        inLanguage:       'en-IN',
        mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
        ...(faqItems.length > 0 ? { mainEntity: { '@type': 'FAQPage', mainEntity: faqItems } } : {}),
      }

    case 'FAQPage':
      return {
        ...base,
        mainEntity: faqItems.length > 0
          ? faqItems
          : [{ '@type': 'Question', name: 'Add FAQ blocks to auto-populate', acceptedAnswer: { '@type': 'Answer', text: '…' } }],
      }

    case 'HowTo':
      return {
        ...base,
        name:        overrides.howToName    || String(post.title   || ''),
        description: overrides.description  || desc,
        image:       imgUrl,
        totalTime:   overrides.totalTime    || 'PT30M',
        estimatedCost: {
          '@type':   'MonetaryAmount',
          currency:  'INR',
          value:     overrides.estimatedCost || '0',
        },
        step: stepItems.length > 0
          ? stepItems
          : [{ '@type': 'HowToStep', position: 1, name: 'Add Steps blocks to auto-populate', text: '…' }],
      }

    default: return base
  }
}
