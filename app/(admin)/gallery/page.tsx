'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { revalidateGallery } from '@/lib/actions'
import { ImageCropUploadModal, type UploadedMediaItem } from '@/components/media/ImageCropUploadModal'
import {
  GripVertical,
  ImageIcon,
  Images,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { clsx } from 'clsx'

type GalleryRow = {
  id: string
  title: string | null
  description: string | null
  image_url: string
  alt_text: string | null
  category: string | null
  sort_order: number
  is_active: boolean
}

type GalleryForm = {
  title: string
  description: string
  image_url: string
  alt_text: string
  category: string
  sort_order: string
  is_active: boolean
}

const EMPTY_FORM: GalleryForm = {
  title: '',
  description: '',
  image_url: '',
  alt_text: '',
  category: '',
  sort_order: '0',
  is_active: true,
}

function toForm(row: GalleryRow): GalleryForm {
  return {
    title: row.title ?? '',
    description: row.description ?? '',
    image_url: row.image_url,
    alt_text: row.alt_text ?? '',
    category: row.category ?? '',
    sort_order: String(row.sort_order),
    is_active: row.is_active,
  }
}

function toPayload(form: GalleryForm) {
  return {
    title: form.title.trim() || null,
    description: form.description.trim() || null,
    image_url: form.image_url.trim(),
    alt_text: form.alt_text.trim() || null,
    category: form.category.trim() || null,
    sort_order: Number.isFinite(Number(form.sort_order)) ? Number(form.sort_order) : 0,
    is_active: Boolean(form.is_active),
  }
}

export default function GalleryPage() {
  const sb = getBrowserClient()
  const [items, setItems] = useState<GalleryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newItem, setNewItem] = useState<GalleryForm>({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<GalleryForm>({ ...EMPTY_FORM })
  const [uploadTarget, setUploadTarget] = useState<'new' | 'edit' | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await sb
      .from('gallery_images')
      .select('*')
      .order('sort_order', { ascending: true })

    setLoading(false)

    if (error) {
      showToast('error', error.message)
      setItems([])
      return
    }

    setItems((data ?? []) as GalleryRow[])
  }, [sb])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const categories = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => item.category && set.add(item.category))
    return Array.from(set).sort((a, z) => a.localeCompare(z))
  }, [items])

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase()
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (!term) return true
      const haystack = [item.title, item.description, item.category].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [items, query, categoryFilter])

  const stats = useMemo(() => {
    const total = items.length
    const active = items.filter((i) => i.is_active).length
    return { total, active, categories: categories.length }
  }, [items, categories])

  const createItem = async () => {
    const payload = toPayload(newItem)

    if (!payload.image_url) {
      showToast('error', 'Please upload an image first.')
      return
    }

    setSaving(true)
    const { error } = await sb.from('gallery_images').insert(payload)
    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateGallery()
    showToast('success', revalidate.success ? 'Photo added and live cache cleared.' : 'Photo added. Live site may update within 1 hour.')
    setNewItem({ ...EMPTY_FORM })
    setShowCreate(false)
    fetchItems()
  }

  const startEdit = (item: GalleryRow) => {
    setEditingId(item.id)
    setEditForm(toForm(item))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ ...EMPTY_FORM })
  }

  const saveItem = async (item: GalleryRow) => {
    const payload = toPayload(editForm)

    if (!payload.image_url) {
      showToast('error', 'Please upload an image first.')
      return
    }

    setSaving(true)
    const { error } = await sb.from('gallery_images').update(payload).eq('id', item.id)
    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateGallery()
    showToast('success', revalidate.success ? 'Photo saved and live cache cleared.' : 'Photo saved. Live site may update within 1 hour.')
    cancelEdit()
    fetchItems()
  }

  const deleteItem = async (item: GalleryRow) => {
    if (!confirm('Delete this gallery photo?')) return

    const { error } = await sb.from('gallery_images').delete().eq('id', item.id)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateGallery()
    showToast('success', revalidate.success ? 'Photo deleted and live cache cleared.' : 'Photo deleted. Live site may update within 1 hour.')
    fetchItems()
  }

  const handleUploadSuccess = (item: UploadedMediaItem) => {
    if (uploadTarget === 'new') {
      setNewItem((current) => ({ ...current, image_url: item.public_url }))
    } else if (uploadTarget === 'edit') {
      setEditForm((current) => ({ ...current, image_url: item.public_url }))
    }
    setUploadTarget(null)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <Images className="w-6 h-6 text-blue-400" />
            Work Gallery
          </h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-2xl">
            Manage the real completed job photos shown on the public &quot;Our Work&quot; gallery page. Only upload genuine Fiixup job photos.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={fetchItems} className="admin-btn-secondary" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
          <button onClick={() => setShowCreate((open) => !open)} className="admin-btn-primary">
            <Plus className="w-4 h-4" />
            Add Photo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.total}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Total Photos</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.active}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Live on site</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.categories}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Categories</p>
        </div>
      </div>

      {showCreate && (
        <div className="admin-card p-5 space-y-4 border-dashed">
          <div>
            <p className="text-sm font-semibold text-white">Add new photo</p>
            <p className="text-xs text-[#6b7280] mt-0.5">Use the &quot;Gallery Photo&quot; crop preset for a consistent grid.</p>
          </div>
          <GalleryFormFields form={newItem} setForm={setNewItem} onUploadClick={() => setUploadTarget('new')} />
          <div className="flex gap-2">
            <button onClick={createItem} disabled={saving} className="admin-btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Photo
            </button>
            <button onClick={() => setShowCreate(false)} className="admin-btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="admin-card p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, description, category…"
            className="admin-input pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="admin-input md:w-48"
        >
          <option value="all">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <Images className="w-8 h-8 text-[#4b5563] mx-auto mb-3" />
          <p className="text-sm text-[#94a3b8]">No gallery photos found.</p>
          <p className="text-xs text-[#6b7280] mt-1">Add your first real job photo above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const editing = editingId === item.id
            return (
              <div key={item.id} className="admin-card overflow-hidden">
                <div className="relative aspect-[4/3] bg-[#0d1117]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url} alt={item.alt_text || item.title || ''} className="h-full w-full object-cover" />
                  <div className="absolute left-2 top-2 flex gap-1.5">
                    <GripVertical className="w-4 h-4 text-white/50" />
                    {!item.is_active && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-black/50 text-gray-300 border-gray-500/30 font-semibold backdrop-blur-sm">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#e2e8f0] truncate">{item.title || 'Untitled photo'}</p>
                      {item.category && (
                        <span className={clsx('inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full border font-semibold bg-blue-500/10 text-blue-300 border-blue-500/20')}>
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-xs text-[#94a3b8] line-clamp-2">{item.description}</p>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => startEdit(item)} className="admin-btn-secondary flex-1 justify-center">Edit</button>
                    <button onClick={() => deleteItem(item)} className="admin-btn-danger">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {editing && (
                    <div className="border-t border-[#2a2d3e] pt-4 space-y-4">
                      <GalleryFormFields form={editForm} setForm={setEditForm} onUploadClick={() => setUploadTarget('edit')} />
                      <div className="flex gap-2">
                        <button onClick={() => saveItem(item)} disabled={saving} className="admin-btn-primary">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save
                        </button>
                        <button onClick={cancelEdit} className="admin-btn-secondary">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {uploadTarget && (
        <ImageCropUploadModal
          uploadFolder="gallery"
          onSuccess={handleUploadSuccess}
          onClose={() => setUploadTarget(null)}
        />
      )}
    </div>
  )
}

function GalleryFormFields({ form, setForm, onUploadClick }: {
  form: GalleryForm
  setForm: React.Dispatch<React.SetStateAction<GalleryForm>>
  onUploadClick: () => void
}) {
  const update = (key: keyof GalleryForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#2a2d3e] bg-[#0d1117]">
          {form.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.image_url} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="w-6 h-6 text-[#94a3b8]" />
          )}
        </div>
        <button type="button" onClick={onUploadClick} className="admin-btn-secondary">
          <Upload className="w-4 h-4" />
          {form.image_url ? 'Replace Photo' : 'Upload Photo'}
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="admin-label">Title</label>
          <input
            value={form.title}
            onChange={(event) => update('title', event.target.value)}
            className="admin-input"
            placeholder="Engine oil change — Koramangala"
          />
        </div>
        <div>
          <label className="admin-label">Category</label>
          <input
            value={form.category}
            onChange={(event) => update('category', event.target.value)}
            className="admin-input"
            placeholder="Car Repair, Bike Repair, Roadside…"
          />
        </div>
        <div className="md:col-span-2">
          <label className="admin-label">Description</label>
          <textarea
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            rows={2}
            className="admin-textarea"
            placeholder="Optional short caption"
          />
        </div>
        <div>
          <label className="admin-label">Alt Text (SEO)</label>
          <input
            value={form.alt_text}
            onChange={(event) => update('alt_text', event.target.value)}
            className="admin-input"
            placeholder="Describe the photo for accessibility & SEO"
          />
        </div>
        <div>
          <label className="admin-label">Sort Order</label>
          <input
            type="number"
            value={form.sort_order}
            onChange={(event) => update('sort_order', event.target.value)}
            className="admin-input"
            placeholder="0"
          />
        </div>
        <label className="md:col-span-2 flex items-center gap-3 text-sm text-[#cbd5e1]">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => update('is_active', event.target.checked)}
            className="w-4 h-4 rounded border-[#334155] bg-[#0f1117]"
          />
          Active (visible on live site)
        </label>
      </div>
    </div>
  )
}
