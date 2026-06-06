'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

export function AdminBackButton({
  fallbackHref,
  className,
  children,
}: {
  fallbackHref: string
  className?: string
  children: ReactNode
}) {
  const router = useRouter()

  const goBack = () => {
    if (typeof window === 'undefined') {
      router.push(fallbackHref)
      return
    }

    const referrer = document.referrer

    try {
      const referrerUrl = referrer ? new URL(referrer) : null
      const isSameAdminOrigin = referrerUrl?.origin === window.location.origin
      const isDifferentPage = referrerUrl?.pathname !== window.location.pathname

      if (window.history.length > 1 && isSameAdminOrigin && isDifferentPage) {
        router.back()
        return
      }
    } catch {
      // Fall through to the safe fallback route.
    }

    router.push(fallbackHref)
  }

  return (
    <button type="button" onClick={goBack} className={className} aria-label="Go back">
      {children}
    </button>
  )
}
