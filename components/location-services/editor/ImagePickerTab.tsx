'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { Check, Image as ImageIcon, Loader2, Plus, Star, Trash2, X } from 'lucide-react'
import { Empty, SectionHeader, s } from './shared'

type Row = Record<string, unknown>

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export function ImagePickerTab({ lsId, images, onRefresh }: {
  lsId: string; images: Row[]; onRefresh: () => void
}) {
  const sb = getBrowserClient()
  const [mediaItems, setMediaItems] = useState<Row[]>([])
  const [loading,    setLoading]    = useState(true)
  const [folder,     setFolder]     = useState('all')
  const [adding,     setAdding]     = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [isHero,     setIsHero]     = useState(false)
  const [altText,    setAltText]    = useState('')
  const [caption,    setCaption]    = useState('')
  const [picked,     setPicked]     = useState<Row | null>(null)

  const FOLDERS = ['all','cities','services','location-services','blog','og','general']

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      let q = sb.from('media_library').select('id,public_url,file_name,title,alt_text,folder').order('created_at', { ascending: false })
      if (folder !== 'all') q = q.eq('folder', folder)
      const { data } = await q
      setMediaItems(data ?? [])
      setLoading(false)
    }
    load()
  }, [folder])

  const addImage = async () => {
    if (!picked) return
    setAdding(true)
    const { error } = await sb.from('service_images').insert({
      ls_id:      parseInt(lsId),
      url:        s(picked.public_url),
      alt_text:   altText || s(picked.alt_text) || s(picked.file_name),
      caption:    caption,
      is_hero:    isHero,
      sort_order: images.length,
    })
    setAdding(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Image added')
    setPicked(null); setAltText(''); setCaption(''); setIsHero(false)
    setShowPicker(false)
    onRefresh()
  }

  const removeImage = async (id: string) => {
    if (!confirm('Remove this image?')) return
    await sb.from('service_images').delete().eq('id', id)
    showToast('success', 'Removed')
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Service Images" count={images.length}>
        <button onClick={() => setShowPicker(true)} className="admin-btn-primary">
          <Plus className="w-4 h-4" /> Add from Media Library
        </button>
      </SectionHeader>

      {images.length === 0 && <Empty>No images yet. Add from Media Library.</Empty>}
      {images.map(row => (
        <div key={s(row.id)} className="admin-card p-4 flex items-start gap-4">
          {s(row.url) && (
            <img src={s(row.url)} alt={s(row.alt_text)}
              className="w-28 h-20 object-cover rounded-lg flex-shrink-0 bg-[#2a2d3e]"
              onError={e => (e.currentTarget.style.display='none')} />
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold text-[#e2e8f0] truncate">{s(row.alt_text)}</p>
            <p className="text-xs text-[#6b7280] truncate">{s(row.url)}</p>
            {Boolean(row.is_hero) && <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">Hero</span>}
          </div>
          <button onClick={() => removeImage(s(row.id))} className="text-[#475569] hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Media picker modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1e2535] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[#1e2535]">
              <h3 className="font-bold text-[#e2e8f0]">Choose from Media Library</h3>
              <button onClick={() => { setShowPicker(false); setPicked(null) }} className="text-[#6b7280] hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* Folder filter */}
            <div className="flex gap-1 p-4 border-b border-[#1e2535] flex-wrap">
              {FOLDERS.map(f => (
                <button key={f} onClick={() => setFolder(f)}
                  className={clsx('px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all',
                    folder === f ? 'tab-active' : 'tab-inactive')}>
                  {f}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {mediaItems.map(item => (
                    <button key={s(item.id)} onClick={() => { setPicked(item); setAltText(s(item.alt_text) || s(item.title) || '') }}
                      className={clsx('relative aspect-square rounded-xl overflow-hidden border-2 transition-all',
                        picked?.id === item.id ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-[#2a2d3e] hover:border-[#3a3d4e]')}>
                      <img src={s(item.public_url)} alt={s(item.alt_text)} className="w-full h-full object-cover bg-[#1a1d27]" />
                      {picked?.id === item.id && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                  {mediaItems.length === 0 && <p className="col-span-5 text-center text-[#6b7280] py-8 text-sm">No images in this folder.</p>}
                </div>
              )}
            </div>

            {/* Options + confirm */}
            {picked && (
              <div className="border-t border-[#1e2535] p-4 space-y-3">
                <div className="flex items-center gap-3 bg-[#0f1117] rounded-xl p-3">
                  <img src={s(picked.public_url)} alt="" className="w-16 h-12 object-cover rounded-lg" />
                  <p className="text-sm text-[#e2e8f0] truncate flex-1">{s(picked.file_name)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="admin-label">Alt Text</label>
                    <input type="text" value={altText} onChange={e => setAltText(e.target.value)} className="admin-input text-sm" />
                  </div>
                  <div>
                    <label className="admin-label">Caption</label>
                    <input type="text" value={caption} onChange={e => setCaption(e.target.value)} className="admin-input text-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button onClick={() => setIsHero(!isHero)}
                      className={clsx('w-8 h-4 rounded-full transition-colors', isHero ? 'bg-blue-600' : 'bg-[#2a2d3e]')}>
                      <span className={clsx('block w-3 h-3 rounded-full bg-white shadow transition-transform', isHero ? 'translate-x-4' : 'translate-x-0.5')} />
                    </button>
                    <span className="text-sm text-[#94a3b8]">Set as Hero Image</span>
                  </label>
                  <button onClick={addImage} disabled={adding} className="admin-btn-primary">
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Add Image
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── SchemaEditor — FAQ schema auto-generate + custom schema ───────────────────
