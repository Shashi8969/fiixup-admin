'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'

export type LinkOption = {
  href: string
  label: string
  target_type: string | null
  target_id: string | null
  page_type?: string | null
}

const LinkOptionsCtx = createContext<LinkOption[]>([])

// Loads the site's internal page list (cms_public_link_options — same view
// used by the Navigation and Internal Links managers) once per Content tab
// mount, so every RichTextField's link popover can offer "search site pages"
// without each field re-querying it independently.
export function LinkOptionsProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<LinkOption[]>([])

  useEffect(() => {
    let cancelled = false
    const sb = getBrowserClient()
    sb.from('cms_public_link_options').select('href,label,target_type,target_id,page_type').order('label').then(({ data }) => {
      if (!cancelled) setOptions((data ?? []) as LinkOption[])
    })
    return () => { cancelled = true }
  }, [])

  return <LinkOptionsCtx.Provider value={options}>{children}</LinkOptionsCtx.Provider>
}

export function useLinkOptions() {
  return useContext(LinkOptionsCtx)
}
