import { redirect } from 'next/navigation'

// Merged into /site-health — see components/health/sections/SeoHealthSection.tsx
export default function SeoHealthPage() {
  redirect('/site-health?tab=seo-health')
}
