import { redirect } from 'next/navigation'

// Merged into /site-health — see components/health/sections/CmsHealthSection.tsx
export default function CmsHealthPage() {
  redirect('/site-health?tab=cms-health')
}
