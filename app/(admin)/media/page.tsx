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
  Upload, FolderOpen, Image as ImageIcon, Check,
  Loader2, Search, RefreshCw, Grid, List,
} from 'lucide-react'
import { clsx } from 'clsx'
import { FOLDERS, type FolderId, type MediaItem, type UploadForm, type WebpUploadSettings } from '@/components/media/types'
import { MediaDetailsPanel } from '@/components/media/MediaDetailsPanel'
import { MediaUploadModal } from '@/components/media/MediaUploadModal'
import { formatSize } from '@/utils/media/formatSize'
import {
  cleanFileBaseName,
  compressImageToWebp,
  DEFAULT_WEBP_COMPRESSION_SETTINGS,
  getFileExtension,
  type PreparedImageUpload,
} from '@/utils/media/webpCompressor'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const BUCKET_PUBLIC_URL = `${SUPABASE_URL}/storage/v1/object/public/images`
const MAX_UPLOAD_SIZE = 52428800

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
  const [uploadForm, setUploadForm] = useState<UploadForm>({
    title: '', alt_text: '', description: '',
    meta_title: '', meta_description: '', caption: '', tags: '',
  })

  const [webpSettings, setWebpSettings] = useState<WebpUploadSettings>(DEFAULT_WEBP_COMPRESSION_SETTINGS)

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

  const buildUniqueStoragePath = useCallback(async (fileName: string) => {
    const ext = getFileExtension(fileName)
    const base = cleanFileBaseName(fileName)

    for (let i = 1; i <= 20; i++) {
      const finalName = i === 1 ? `${base}.${ext}` : `${base}-${i}.${ext}`
      const path = `${uploadFolder}/${finalName}`
      const { data } = await sb
        .from('media_library')
        .select('id')
        .eq('storage_path', path)
        .maybeSingle()

      if (!data) return path
    }

    return `${uploadFolder}/${base}-${Date.now()}.${ext}`
  }, [uploadFolder])

  // ── Upload handler with optional PNG/JPG → WebP compression ────────────────
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          showToast('error', `${file.name} is not an image`)
          continue
        }

        if (file.size > MAX_UPLOAD_SIZE) {
          showToast('error', `${file.name} exceeds 50MB limit`)
          continue
        }

        let prepared: PreparedImageUpload
        try {
          prepared = await compressImageToWebp(file, webpSettings)
        } catch (error) {
          showToast('error', error instanceof Error ? error.message : `Could not compress ${file.name}`)
          continue
        }

        if (prepared.file.size > MAX_UPLOAD_SIZE) {
          showToast('error', `${prepared.fileName} exceeds 50MB limit after compression`)
          continue
        }

        const path = await buildUniqueStoragePath(prepared.fileName)

        const { error: uploadError } = await sb.storage
          .from('images')
          .upload(path, prepared.file, { cacheControl: '3600', upsert: false })

        if (uploadError) { showToast('error', uploadError.message); continue }

        const publicUrl = `${BUCKET_PUBLIC_URL}/${path}`

        const { error: dbError } = await sb.from('media_library').insert({
          storage_path:     path,
          public_url:       publicUrl,
          folder:           uploadFolder,
          file_name:        path.split('/').pop() ?? prepared.fileName,
          file_size:        prepared.finalSize,
          mime_type:        prepared.mimeType,
          width:            prepared.width,
          height:           prepared.height,
          title:            uploadForm.title || prepared.fileName.replace(/\.[^/.]+$/, ''),
          alt_text:         uploadForm.alt_text,
          description:      uploadForm.description,
          meta_title:       uploadForm.meta_title,
          meta_description: uploadForm.meta_description,
          caption:          uploadForm.caption,
          tags:             uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          crop_mode:        'contain',
          crop_ratio:       'auto',
          focal_x:          50,
          focal_y:          50,
        })

        if (dbError) {
          showToast('error', `Metadata error: ${dbError.message}`)
        } else if (prepared.convertedToWebp) {
          showToast('success', `${prepared.originalFileName} → ${path.split('/').pop()} uploaded`)
        } else {
          showToast('success', `${prepared.fileName} uploaded`)
        }
      }
    } finally {
      setUploading(false)
      setShowUpload(false)
      setUploadForm({ title:'', alt_text:'', description:'', meta_title:'', meta_description:'', caption:'', tags:'' })
      if (fileRef.current) fileRef.current.value = ''
      fetchItems()
    }
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
    await sb.storage.from('images').remove([item.storage_path])
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
                    className={clsx('w-full h-full bg-[#1a1d27]', item.crop_mode === 'cover' ? 'object-cover' : 'object-contain')}
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
                    className={clsx('w-12 h-12 rounded-lg bg-[#1a1d27] flex-shrink-0', item.crop_mode === 'cover' ? 'object-cover' : 'object-contain')} />
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
        <MediaDetailsPanel
          selected={selected}
          setSelected={setSelected}
          editing={editing}
          setEditing={setEditing}
          editForm={editForm}
          setEditForm={setEditForm}
          savingMeta={savingMeta}
          saveMeta={saveMeta}
          deleteItem={deleteItem}
          copyUrl={copyUrl}
        />
      )}

      {/* ── UPLOAD MODAL ── */}
      {showUpload && (
        <MediaUploadModal
          fileRef={fileRef}
          uploadFolder={uploadFolder}
          setUploadFolder={setUploadFolder}
          uploadForm={uploadForm}
          setUploadForm={setUploadForm}
          webpSettings={webpSettings}
          setWebpSettings={setWebpSettings}
          uploading={uploading}
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
        />
      )}
    </div>
  )
}
