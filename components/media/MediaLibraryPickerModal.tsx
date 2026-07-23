'use client'

import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { Check, Loader2, Search, X } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase'
import { FOLDERS, type MediaItem } from '@/components/media/types'

export type PickedMedia = Pick<MediaItem, 'id' | 'public_url' | 'file_name' | 'title' | 'alt_text' | 'caption' | 'folder'>

// Generic "browse the Media Library and pick one image" modal — reusable
// across editors (unlike components/location-services/editor/ImagePickerTab.tsx,
// which is hard-wired to insert directly into the service_images table).
// This one just hands the picked row back via onSelect.
export function MediaLibraryPickerModal({ onSelect, onClose }: {
  onSelect: (item: PickedMedia) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<PickedMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [folder, setFolder] = useState<string>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    const sb = getBrowserClient()
    setLoading(true)
    let q = sb.from('media_library').select('id,public_url,file_name,title,alt_text,caption,folder').order('created_at', { ascending: false })
    if (folder !== 'all') q = q.eq('folder', folder)
    q.then(({ data }) => {
      if (!cancelled) { setItems((data ?? []) as PickedMedia[]); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [folder])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => `${item.file_name} ${item.title ?? ''} ${item.alt_text ?? ''}`.toLowerCase().includes(term))
  }, [items, query])

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-[#1e2535] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#1e2535]">
          <h3 className="font-bold text-[#e2e8f0]">Choose from Media Library</h3>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 border-b border-[#1e2535] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6b7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, title, or alt text…"
              className="admin-input pl-9 text-sm" />
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setFolder('all')}
              className={clsx('px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all', folder === 'all' ? 'tab-active' : 'tab-inactive')}>
              All Images
            </button>
            {FOLDERS.filter((f) => f.id !== 'all').map((f) => (
              <button key={f.id} onClick={() => setFolder(f.id)}
                className={clsx('px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all', folder === f.id ? 'tab-active' : 'tab-inactive')}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {filtered.map((item) => (
                <button key={item.id} onClick={() => onSelect(item)}
                  className="group relative aspect-square rounded-xl overflow-hidden border-2 border-[#2a2d3e] hover:border-blue-500 transition-all">
                  <img src={item.public_url} alt={item.alt_text ?? ''} className="w-full h-full object-cover bg-[#1a1d27]" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <p className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] truncate px-1.5 py-1 opacity-0 group-hover:opacity-100">
                    {item.title || item.file_name}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && <p className="col-span-5 text-center text-[#6b7280] py-8 text-sm">No images found.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
