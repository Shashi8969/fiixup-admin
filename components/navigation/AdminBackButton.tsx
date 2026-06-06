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
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(fallbackHref)
  }

  return (
    <button type="button" onClick={goBack} className={className} aria-label="Go back">
      {children}
    </button>
  )
}
