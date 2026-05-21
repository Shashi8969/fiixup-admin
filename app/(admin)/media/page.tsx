'use client'
// app/(admin)/media/page.tsx
// Full Media Library — browse folders, upload images, edit metadata
// Bucket: images (public, 50MB limit)
// Folders: cities/ services/ blog/ og/ team/ location-services/ general/
// Table: media_library (stores metadata for every image)

import { useEffect, useState, useCallback, useRef } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast }        from '@/components/ui/Toast'
import {
  Upload, FolderOpen, Image as ImageIcon, X, Check,
  Loader2, Trash2, Copy, Search, RefreshCw, Edit2, Save,
  ExternalLink, Grid, List,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Folder definitions ────────────────────────────────────────────────────────
const FOLDERS = [
  { id: 'all',              label: 'All Images',        color: 'blue'   },
  { id: 'cities',           label: 'Cities',            color: 'green'  },
  { id: 'services',         label: 'Services',          color: 'purple' },
  { id: 'blog',             label: 'Blog',              color: 'amber'  },
  { id: 'location-services',label: 'Location Services', color: 'teal'   },
  { id: 'og',               label: 'OG Images',         color: 'orange' },
  { id: 'team',             label: 'Team',              color: 'pink'   },
  { id: 'general',          label: 'General',           color: 'gray'   },
] as const

type FolderId = typeof FOLDERS[number]['id']

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const BUCKET_PUBLIC_URL = `${SUPABASE_URL}/storage/v1/object/public/images`

type MediaItem = {
  id:              string
  storage_path:    string
  public_url:      string
  folder:          string
  file_name:       string
  file_size:       number | null
  mime_type:       string | null
  width:           number | null
  height:          number | null
  title:           string | null
  description:     string | null
  alt_text:        string | null
  meta_title:      string | null
  meta_description:string | null
  caption:         string | null
  tags:            string[]
  created_at:      string
}

export default function MediaLibraryPage() {
  const sb = getBrowserClient()

  const [folder,     setFolder]     = useState<FolderId>('all')
  const [items,      setItems]      = useState<MediaItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [uploading,  setUploading]  = useState(false)
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState<MediaItem | null>(null)
  const [viewMode,   setViewMode]   = useState<'grid' | 'list'>('grid')
  const [uploadFolder, setUploadFolder] = useState<string>('general')
  const [showUpload, setShowUpload] = useState(false)
  const [dragOver,   setDragOver]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '', alt_text: '', description: '',
    meta_title: '', meta_description: '', caption: '', tags: '',
  })

  // Edit metadata state
  const [editing,    setEditing]    = useState(false)
  const [editForm,   setEditForm]   = useState<Partial<MediaItem>>({})
  const [savingMeta, setSavingMeta] = useState(false)

  // ── Fetch images from media_library table ─────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true)
    let q = sb.from('media_library').select('*').order('created_at', { ascending: false })
    if (folder !== 'all') q = q.eq('folder', folder)
    if (search) q = q.ilike('file_name', `%${search}%`)
    const { data, error } = await q
    if (error) { showToast('error', error.message); setLoading(false); return }
    setItems(data ?? [])
    setLoading(false)
  }, [folder, search])

  useEffect(() => { fetchItems() }, [fetchItems])

  // ── Upload handler ─────────────────────────────────────────────────────────
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)

    for (const file of Array.from(files)) {
      // Validate
      if (!file.type.startsWith('image/')) {
        showToast('error', `${file.name} is not an image`)
        continue
      }
      if (file.size > 52428800) {
        showToast('error', `${file.name} exceeds 50MB limit`)
        continue
      }

      // Generate unique filename
      const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const base = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9-]/gi, '-').toLowerCase()
      const path = `${uploadFolder}/${base}-${Date.now()}.${ext}`

      // Upload to storage
      const { error: uploadError } = await sb.storage
        .from('images')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadError) { showToast('error', uploadError.message); continue }

      const publicUrl = `${BUCKET_PUBLIC_URL}/${path}`

      // Save metadata to media_library
      const { error: dbError } = await sb.from('media_library').insert({
        storage_path:     path,
        public_url:       publicUrl,
        folder:           uploadFolder,
        file_name:        file.name,
        file_size:        file.size,
        mime_type:        file.type,
        title:            uploadForm.title || file.name.replace(/\.[^/.]+$/, ''),
        alt_text:         uploadForm.alt_text,
        description:      uploadForm.description,
        meta_title:       uploadForm.meta_title,
        meta_description: uploadForm.meta_description,
        caption:          uploadForm.caption,
        tags:             uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      })

      if (dbError) showToast('error', `Metadata error: ${dbError.message}`)
      else showToast('success', `${file.name} uploaded`)
    }

    setUploading(false)
    setShowUpload(false)
    setUploadForm({ title:'', alt_text:'', description:'', meta_title:'', meta_description:'', caption:'', tags:'' })
    fetchItems()
  }

  // ── Save metadata edits ────────────────────────────────────────────────────
  const saveMeta = async () => {
    if (!selected) return
    setSavingMeta(true)
    const { error } = await sb.from('media_library')
      .update({ ...editForm, updated_at: new Date().toISOString() })
      .eq('id', selected.id)
    setSavingMeta(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Metadata saved')
    setEditing(false)
    setSelected(prev => prev ? { ...prev, ...editForm } as MediaItem : null)
    fetchItems()
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteItem = async (item: MediaItem) => {
    if (!confirm(`Delete "${item.file_name}"? This cannot be undone.`)) return
    // Delete from storage
    await sb.storage.from('images').remove([item.storage_path])
    // Delete from DB
    const { error } = await sb.from('media_library').delete().eq('id', item.id)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Image deleted')
    setSelected(null)
    fetchItems()
  }

  // ── Copy URL ──────────────────────────────────────────────────────────────
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    showToast('success', 'URL copied to clipboard')
  }

  const filtered = items.filter(item =>
    !search ||
    item.file_name.toLowerCase().includes(search.toLowerCase()) ||
    (item.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (item.alt_text ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden -m-6">

      {/* ── LEFT: Folder sidebar ── */}
      <div className="w-52 flex-shrink-0 bg-[#111827] border-r border-[#1e2535] flex flex-col">
        <div className="p-4 border-b border-[#1e2535]">
          <h2 className="text-sm font-bold text-[#e2e8f0]">Media Library</h2>
          <p className="text-xs text-[#6b7280] mt-0.5">Supabase · images bucket</p>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {FOLDERS.map(f => (
            <button key={f.id} onClick={() => { setFolder(f.id as FolderId); setSelected(null) }}
              className={clsx(
                'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors',
                folder === f.id
                  ? 'bg-blue-600/20 text-blue-400 font-semibold'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#1e2535]'
              )}>
              <FolderOpen className="w-4 h-4 flex-shrink-0" />
              {f.label}
            </button>
          ))}
        </div>

        {/* Upload button */}
        <div className="p-4 border-t border-[#1e2535]">
          <button onClick={() => { setShowUpload(true); setUploadFolder(folder === 'all' ? 'general' : folder) }}
            className="admin-btn-primary w-full justify-center text-xs">
            <Upload className="w-3.5 h-3.5" /> Upload Image
          </button>
        </div>
      </div>

      {/* ── CENTER: Image grid ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e2535] bg-[#0f1117]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search images…" className="admin-input pl-9 text-xs py-1.5" />
          </div>
          <span className="text-xs text-[#6b7280]">{filtered.length} images</span>
          <button onClick={fetchItems} className="admin-btn-secondary p-1.5">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex border border-[#2a2d3e] rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')}
              className={clsx('px-2.5 py-1.5', viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-[#6b7280] hover:text-white')}>
              <Grid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')}
              className={clsx('px-2.5 py-1.5', viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-[#6b7280] hover:text-white')}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drop zone overlay */}
        <div
          className={clsx('flex-1 overflow-y-auto p-4 relative', dragOver && 'ring-2 ring-blue-500 ring-inset')}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
        >
          {dragOver && (
            <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center z-10 rounded-xl border-2 border-dashed border-blue-500">
              <p className="text-blue-400 text-lg font-semibold">Drop images here to upload</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#6b7280]">
              <ImageIcon className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No images in this folder.</p>
              <p className="text-xs mt-1">Click "Upload Image" or drag & drop files here.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.map(item => (
                <button key={item.id} onClick={() => { setSelected(item); setEditForm(item); setEditing(false) }}
                  className={clsx(
                    'group relative aspect-square rounded-xl overflow-hidden border-2 transition-all',
                    selected?.id === item.id
                      ? 'border-blue-500 ring-2 ring-blue-500/30'
                      : 'border-[#2a2d3e] hover:border-[#3a3d4e]'
                  )}>
                  <img src={item.public_url} alt={item.alt_text ?? item.file_name}
                    className="w-full h-full object-cover bg-[#1a1d27]"
                    onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%231a1d27" width="100" height="100"/></svg>' }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                    <p className="text-white text-[10px] truncate w-full">{item.file_name}</p>
                  </div>
                  {selected?.id === item.id && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(item => (
                <button key={item.id} onClick={() => { setSelected(item); setEditForm(item); setEditing(false) }}
                  className={clsx(
                    'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                    selected?.id === item.id
                      ? 'border-blue-500 bg-blue-500/5'
                      : 'border-[#2a2d3e] hover:border-[#3a3d4e] hover:bg-[#1a1d27]'
                  )}>
                  <img src={item.public_url} alt=""
                    className="w-12 h-12 object-cover rounded-lg bg-[#1a1d27] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#e2e8f0] truncate">{item.title ?? item.file_name}</p>
                    <p className="text-xs text-[#6b7280] truncate">{item.file_name}</p>
                    <p className="text-xs text-[#475569] mt-0.5">{item.folder} · {formatSize(item.file_size)}</p>
                  </div>
                  {selected?.id === item.id && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Image detail panel ── */}
      {selected && (
        <div className="w-80 flex-shrink-0 bg-[#111827] border-l border-[#1e2535] flex flex-col overflow-hidden">

          {/* Image preview */}
          <div className="relative bg-[#0f1117] aspect-video flex items-center justify-center flex-shrink-0">
            <img src={selected.public_url} alt={selected.alt_text ?? ''}
              className="max-w-full max-h-full object-contain p-2" />
            <button onClick={() => setSelected(null)}
              className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5 p-3 border-b border-[#1e2535]">
            <button onClick={() => copyUrl(selected.public_url)}
              className="admin-btn-secondary flex-1 justify-center text-xs py-1.5">
              <Copy className="w-3.5 h-3.5" /> Copy URL
            </button>
            <a href={selected.public_url} target="_blank" rel="noopener noreferrer"
              className="admin-btn-secondary px-2.5 py-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button onClick={() => deleteItem(selected)}
              className="admin-btn-danger px-2.5 py-1.5">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Metadata */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">

            {/* File info */}
            <div className="bg-[#0f1117] rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">File Info</p>
              <InfoRow label="Name"   value={selected.file_name} />
              <InfoRow label="Folder" value={selected.folder} />
              <InfoRow label="Size"   value={formatSize(selected.file_size)} />
              <InfoRow label="Type"   value={selected.mime_type ?? '—'} />
              <InfoRow label="Path"   value={selected.storage_path} mono />
              <InfoRow label="Uploaded" value={new Date(selected.created_at).toLocaleDateString('en-IN')} />
            </div>

            {/* Editable metadata */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">Metadata</p>
              {!editing ? (
                <button onClick={() => { setEditing(true); setEditForm(selected) }}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              ) : (
                <div className="flex gap-1.5">
                  <button onClick={saveMeta} disabled={savingMeta}
                    className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
                    {savingMeta ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </button>
                  <button onClick={() => setEditing(false)} className="text-xs text-[#6b7280] hover:text-white">
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="space-y-2.5">
                {[
                  { key: 'title',            label: 'Title'            },
                  { key: 'alt_text',         label: 'Alt Text'         },
                  { key: 'caption',          label: 'Caption'          },
                  { key: 'description',      label: 'Description'      },
                  { key: 'meta_title',       label: 'Meta Title'       },
                  { key: 'meta_description', label: 'Meta Description' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="admin-label">{f.label}</label>
                    {f.key === 'description' || f.key === 'meta_description' ? (
                      <textarea
                        value={String((editForm as Record<string,unknown>)[f.key] ?? '')}
                        onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                        rows={2} className="admin-textarea text-xs" />
                    ) : (
                      <input type="text"
                        value={String((editForm as Record<string,unknown>)[f.key] ?? '')}
                        onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="admin-input text-xs" />
                    )}
                  </div>
                ))}
                <div>
                  <label className="admin-label">Tags (comma separated)</label>
                  <input type="text"
                    value={Array.isArray((editForm as Record<string,unknown>).tags) ? ((editForm as Record<string,unknown>).tags as string[]).join(', ') : ''}
                    onChange={e => setEditForm(p => ({ ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                    className="admin-input text-xs" placeholder="hero, bangalore, mechanic" />
                </div>
                <div>
                  <label className="admin-label">Move to Folder</label>
                  <select
                    value={String((editForm as Record<string,unknown>).folder ?? 'general')}
                    onChange={e => setEditForm(p => ({ ...p, folder: e.target.value }))}
                    className="admin-input text-xs">
                    {FOLDERS.filter(f => f.id !== 'all').map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <InfoRow label="Title"            value={selected.title} />
                <InfoRow label="Alt Text"         value={selected.alt_text} />
                <InfoRow label="Caption"          value={selected.caption} />
                <InfoRow label="Description"      value={selected.description} />
                <InfoRow label="Meta Title"       value={selected.meta_title} />
                <InfoRow label="Meta Description" value={selected.meta_description} />
                {selected.tags?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-[#6b7280] font-semibold uppercase tracking-wider mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {selected.tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-[#2a2d3e] text-[#94a3b8] px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Public URL */}
            <div>
              <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1.5">Public URL</p>
              <div className="bg-[#0f1117] rounded-lg p-2 flex items-start gap-2">
                <p className="text-[10px] font-mono text-[#6b7280] flex-1 break-all leading-relaxed">
                  {selected.public_url}
                </p>
                <button onClick={() => copyUrl(selected.public_url)}
                  className="flex-shrink-0 text-[#6b7280] hover:text-blue-400 transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD MODAL ── */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1e2535] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#1e2535]">
              <h2 className="text-base font-bold text-[#e2e8f0]">Upload Image</h2>
              <button onClick={() => setShowUpload(false)} className="text-[#6b7280] hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">

              {/* Folder selector */}
              <div>
                <label className="admin-label">Upload to folder</label>
                <div className="grid grid-cols-4 gap-2">
                  {FOLDERS.filter(f => f.id !== 'all').map(f => (
                    <button key={f.id} onClick={() => setUploadFolder(f.id)}
                      className={clsx(
                        'px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center',
                        uploadFolder === f.id
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-[#2a2d3e] text-[#6b7280] hover:border-[#3a3d4e] hover:text-white'
                      )}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files) }}
                className="border-2 border-dashed border-[#2a2d3e] hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition-colors group">
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-sm text-[#6b7280]">Uploading…</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-[#6b7280] mx-auto mb-2 group-hover:text-blue-400 transition-colors" />
                    <p className="text-sm font-semibold text-[#e2e8f0]">Click to select or drag & drop</p>
                    <p className="text-xs text-[#6b7280] mt-1">JPG, PNG, WebP, GIF — max 50MB · Multiple files supported</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => handleUpload(e.target.files)} />

              {/* Metadata fields */}
              <div className="border-t border-[#1e2535] pt-4 space-y-3">
                <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Image Metadata (applied to all uploaded images)</p>

                {[
                  { key: 'title',            label: 'Title',            placeholder: 'Mechanic at work in Bangalore'    },
                  { key: 'alt_text',         label: 'Alt Text',         placeholder: 'Fiixup mechanic repairing a car'  },
                  { key: 'caption',          label: 'Caption',          placeholder: 'Doorstep car repair in Bangalore'  },
                  { key: 'meta_title',       label: 'Meta Title',       placeholder: 'Car Repair Bangalore — Fiixup'     },
                ].map(f => (
                  <div key={f.key}>
                    <label className="admin-label">{f.label}</label>
                    <input type="text"
                      value={(uploadForm as Record<string,string>)[f.key]}
                      onChange={e => setUploadForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} className="admin-input text-sm" />
                  </div>
                ))}

                <div>
                  <label className="admin-label">Description</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                    rows={2} className="admin-textarea text-sm"
                    placeholder="Detailed description of the image for SEO" />
                </div>

                <div>
                  <label className="admin-label">Meta Description</label>
                  <textarea
                    value={uploadForm.meta_description}
                    onChange={e => setUploadForm(p => ({ ...p, meta_description: e.target.value }))}
                    rows={2} className="admin-textarea text-sm"
                    placeholder="SEO meta description for this image page" />
                </div>

                <div>
                  <label className="admin-label">Tags (comma separated)</label>
                  <input type="text"
                    value={uploadForm.tags}
                    onChange={e => setUploadForm(p => ({ ...p, tags: e.target.value }))}
                    placeholder="bangalore, mechanic, car-repair" className="admin-input text-sm" />
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="admin-btn-primary w-full justify-center">
                {uploading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                  : <><Upload className="w-4 h-4" /> Select & Upload Images</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────────────────────
function InfoRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] text-[#6b7280] font-semibold uppercase tracking-wider">{label}</p>
      <p className={clsx('text-xs text-[#e2e8f0] mt-0.5 break-all', mono && 'font-mono text-[#6b7280]')}>{value}</p>
    </div>
  )
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}