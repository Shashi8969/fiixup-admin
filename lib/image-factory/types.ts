export type ImageVariant = 'hero' | 'cover' | 'section'

export type ImageFactoryTable =
  | 'cities'
  | 'areas'
  | 'services'
  | 'location_services'
  | 'global_service_pages'
  | 'city_service_pages'
  | 'posts'

export type ImageFactoryTarget = {
  key: string
  table: ImageFactoryTable
  id: string | number
  slug: string
  title: string
  city?: string
  area?: string
  service?: string
  category?: string
  pagePath?: string
  currentImage?: string | null
  targetField: 'hero_image_url' | 'image_url' | 'image'
  altField: 'hero_image_alt' | 'image_alt'
  variant: ImageVariant
  sectionHeading?: string
  sectionIndex?: number
}

export type FactoryScanResponse = {
  targets: ImageFactoryTarget[]
  total: number
  byTable: Record<string, number>
  byVariant: Record<string, number>
}
