export type SchemaEntityType =
  | 'WebPage'
  | 'LocalBusiness'
  | 'Service'
  | 'FAQPage'
  | 'BreadcrumbList'
  | 'Article'
  | 'BlogPosting'
  | 'HowTo'
  | 'Organization'

export type SchemaPageKind = 'city' | 'service' | 'cityServicePage' | 'locationService' | 'post' | 'globalService' | 'area'

export const SCHEMA_OPTIONS: Record<SchemaEntityType, { label: string; desc: string; bestFor: SchemaPageKind[] }> = {
  WebPage: {
    label: 'WebPage',
    desc: 'Base page schema for city, service and SEO landing pages.',
    bestFor: ['city', 'service', 'cityServicePage', 'locationService', 'globalService', 'area'],
  },
  LocalBusiness: {
    label: 'LocalBusiness',
    desc: 'Fiixup business entity, phone, area served and service location signals.',
    bestFor: ['city', 'cityServicePage', 'locationService', 'globalService', 'area'],
  },
  Service: {
    label: 'Service',
    desc: 'Best schema for car/bike/towing/roadside service pages.',
    bestFor: ['service', 'cityServicePage', 'locationService', 'globalService'],
  },
  FAQPage: {
    label: 'FAQPage',
    desc: 'Auto-builds FAQ schema from FAQ rows or FAQ blocks.',
    bestFor: ['city', 'service', 'cityServicePage', 'locationService', 'post', 'globalService', 'area'],
  },
  BreadcrumbList: {
    label: 'BreadcrumbList',
    desc: 'Helps Google understand page hierarchy and internal structure.',
    bestFor: ['city', 'service', 'cityServicePage', 'locationService', 'post', 'globalService', 'area'],
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
    desc: 'Auto-builds from Steps blocks in the content editor. Google removed HowTo rich results from Search in 2023 — use only if you want the structured data for non-Google purposes.',
    bestFor: ['post', 'locationService', 'cityServicePage', 'area'],
  },
  Organization: {
    label: 'Organization',
    desc: 'Fiixup brand identity, logo, website and contact profile.',
    bestFor: ['city'],
  },
}

export const RECOMMENDED_SCHEMA_TYPES: Record<SchemaPageKind, SchemaEntityType[]> = {
  city: ['WebPage', 'LocalBusiness', 'BreadcrumbList', 'Organization', 'FAQPage'],
  service: ['WebPage', 'Service', 'BreadcrumbList', 'FAQPage'],
  cityServicePage: ['WebPage', 'Service', 'LocalBusiness', 'BreadcrumbList', 'FAQPage'],
  locationService: ['WebPage', 'Service', 'LocalBusiness', 'BreadcrumbList', 'FAQPage'],
  post: ['BlogPosting', 'BreadcrumbList', 'FAQPage'],
  globalService: ['Service', 'LocalBusiness', 'BreadcrumbList', 'FAQPage'],
  area: ['WebPage', 'LocalBusiness', 'BreadcrumbList', 'FAQPage'],
}
