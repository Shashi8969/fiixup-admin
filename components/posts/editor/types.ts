export type Block = Record<string, unknown> & { type: string; _id: string }

export type SchemaType = 'none' | 'BlogPosting' | 'Article' | 'NewsArticle' | 'FAQPage' | 'HowTo'

export const TABS = ['SEO', 'Schema', 'Content', 'Preview', 'Settings'] as const
export type Tab = typeof TABS[number]
