export type SchemaEntityType =
  | 'WebPage'
  | 'LocalBusiness'
  | 'Service'
  | 'FAQPage'
  | 'BreadcrumbList'
  | 'AggregateRating'
  | 'Article'
  | 'BlogPosting'
  | 'HowTo'
  | 'Organization'

export type SchemaPageKind = 'city' | 'service' | 'cityServicePage' | 'locationService' | 'post'

export const SCHEMA_OPTIONS: Record<SchemaEntityType, { label: string; desc: string; bestFor: SchemaPageKind[] }> = {
  WebPage: {
    label: 'WebPage',
    desc: 'Base page schema for city, service and SEO landing pages.',
    bestFor: ['city', 'service', 'cityServicePage', 'locationService'],
  },
  LocalBusiness: {
    label: 'LocalBusiness',
    desc: 'Fiixup business entity, phone, area served and service location signals.',
    bestFor: ['city', 'cityServicePage', 'locationService'],
  },
  Service: {
    label: 'Service',
    desc: 'Best schema for car/bike/towing/roadside service pages.',
    bestFor: ['service', 'cityServicePage', 'locationService'],
  },
  FAQPage: {
    label: 'FAQPage',
    desc: 'Auto-builds FAQ schema from FAQ rows or FAQ blocks.',
    bestFor: ['city', 'service', 'cityServicePage', 'locationService', 'post'],
  },
  BreadcrumbList: {
    label: 'BreadcrumbList',
    desc: 'Helps Google understand page hierarchy and internal structure.',
    bestFor: ['city', 'service', 'cityServicePage', 'locationService', 'post'],
  },
  AggregateRating: {
    label: 'AggregateRating',
    desc: 'Uses rating and review count already stored in the page.',
    bestFor: ['service', 'cityServicePage', 'locationService'],
  },
  Article: {
    label: 'Article',
    desc: 'General article schema for non-news blog content.',
    bestFor: ['post'],
  },
  BlogPosting: {
    label: 'BlogPosting',
    desc: 'Best schema for Fiixup blog guides and informational posts.',
    bestFor: ['post'],
  },
  HowTo: {
    label: 'HowTo',
    desc: 'Use only for true step-by-step guides with clear actions.',
    bestFor: ['post'],
  },
  Organization: {
    label: 'Organization',
    desc: 'Fiixup brand identity, logo, website and contact profile.',
    bestFor: ['city'],
  },
}

export const RECOMMENDED_SCHEMA_TYPES: Record<SchemaPageKind, SchemaEntityType[]> = {
  city: ['WebPage', 'LocalBusiness', 'BreadcrumbList', 'Organization', 'FAQPage'],
  service: ['WebPage', 'Service', 'BreadcrumbList', 'FAQPage', 'AggregateRating'],
  cityServicePage: ['WebPage', 'Service', 'LocalBusiness', 'BreadcrumbList', 'FAQPage', 'AggregateRating'],
  locationService: ['WebPage', 'Service', 'LocalBusiness', 'BreadcrumbList', 'FAQPage', 'AggregateRating'],
  post: ['BlogPosting', 'BreadcrumbList', 'FAQPage'],
}
