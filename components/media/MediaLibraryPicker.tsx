'use client'

import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { ImageIcon, Loader2, Search, X } from 'lucide-react'

export type MediaLibraryItem = {
  id: string
  public_url: string
  file_name: string
  title: string | null
  alt_text: string | null
  folder: string | null
  width: number | null
  height: number | null
}

type Props = {
  /** Restrict results to one Storage folder, e.g. "brands". Omit to browse everything. */
  folder?: string
  onSelect: (item: MediaLibraryItem) => void
  onClose: () => void
}

export function MediaLibraryPicker({ folder, onSelect, onClose }: Props) {
  const sb = getBrowserClient()
  const [items, setItems] = useState<MediaLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      let request = sb
        .from('media_library')
        .select('id, public_url, file_name, title, alt_text, folder, width, height')
        .order('created_at', { ascending: false })
        .limit(300)

      if (folder) request = request.eq('folder', folder)

      const { data, error } = await request
      if (cancelled) return
      setLoading(false)

      if (error) {
        showToast('error', error.message)
        return
      }
      setItems((data ?? []) as MediaLibraryItem[])
    }

    load()
    return () => { cancelled = true }
  }, [folder, sb])

  const filtered = items.filter((item) => {
    if (!query.trim()) return true
    const term = query.trim().toLowerCase()
    return [item.title, item.file_name, item.alt_text].filter(Boolean).join(' ').toLowerCase().includes(term)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative flex w-full max-w-3xl max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-[#1e2535] bg-[#111827] shadow-2xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[#1e2535] px-6 py-4">
          <div>
            <h2 className="text-sm font-bold text-[#e2e8f0]">Choose from Media Library</h2>
            <p className="text-xs text-[#6b7280]">{folder ? `Showing images from "${folder}/"` : 'All uploaded images'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#6b7280] transition-colors hover:bg-[#1e2535] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-shrink-0 border-b border-[#1e2535] px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full rounded-xl border border-[#2a2d3e] bg-[#1a1d27] py-2 pl-9 pr-3 text-sm text-[#e2e8f0] placeholder:text-[#374151] focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ImageIcon className="mx-auto mb-3 h-8 w-8 text-[#4b5563]" />
              <p className="text-sm text-[#94a3b8]">No images found{folder ? ` in "${folder}"` : ''}.</p>
              <p className="mt-1 text-xs text-[#6b7280]">Upload one first, then it will show up here for reuse.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-[#2a2d3e] bg-[#0d1117] transition-colors hover:border-blue-500"
                >
                  <div className="flex aspect-square items-center justify-center bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.public_url}
                      alt={item.alt_text || item.title || item.file_name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <p className="truncate px-2 py-1.5 text-[11px] text-[#94a3b8] group-hover:text-white">
                    {item.title || item.file_name}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
