const DEFAULT_PUBLIC_SITE_URL = 'https://fiixup.in'

export const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_FIIXUP_SITE_URL || DEFAULT_PUBLIC_SITE_URL)
  .replace(/\/+$/, '')

export function publicSiteUrl(path = '/') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${PUBLIC_SITE_URL}${cleanPath}`
}
