// utils/seo/editorLink.ts
// Maps a seo_pages row to the admin editor route that actually owns that
// content, so an SEO issue can link straight to its fix. Routes confirmed
// against app/(admin)/*/[id]/page.tsx and app/(admin)/*/[slug]/page.tsx.

import type { SeoPageRow } from '@/utils/seo/pageSignals'

export function resolveEditorHref(row: SeoPageRow): string | null {
  const slugFromPath = (row.url_path ?? '').replace(/^\/+|\/+$/g, '').split('/').pop() ?? ''

  switch (row.page_type) {
    case 'post':
      return slugFromPath ? `/posts/${slugFromPath}` : '/posts'
    case 'area_service':
    case 'city_service':
      return row.location_service_id ? `/location-services/${row.location_service_id}` : '/location-services'
    case 'city_service_category':
      return row.city_service_page_id ? `/city-service-pages/${row.city_service_page_id}` : '/city-service-pages'
    case 'city_hub': {
      const citySlug = (row.url_path ?? '').replace(/^\/+/, '').split('/')[0]
      return citySlug ? `/cities/${citySlug}` : '/cities'
    }
    case 'home':
      return '/homepage'
    default:
      return null
  }
}
