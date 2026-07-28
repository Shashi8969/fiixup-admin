import { redirect } from 'next/navigation'

// Merged into /site-health — see components/health/sections/OverviewSection.tsx
export default function ProjectAuditPage() {
  redirect('/site-health?tab=overview')
}
