'use client'
/**
 * MediaDetailsPanel.tsx
 *
 * Right-hand detail panel in the Media Library.
 *
 * NEW — Filename Rename feature:
 *   • Edit the filename inline (pencil icon next to the name in File Info).
 *   • Sanitized slug preview shown in real-time below the input.
 *   • On Save: copies file to new storage path, deletes old path,
 *     updates media_library row (storage_path, public_url, file_name).
 *   • Supabase has no rename API — copy + delete is the correct approach.
 */

import { useState } from 'react'
import {
  Copy, Edit2, ExternalLink, FileEdit, Loader2,
  Save, Trash2, X, Check, AlertCircle,
} from 'lucide-react'
import { getBrowserClient }   from '@/lib/supabase'
import { FOLDERS, type MediaItem } from '@/components/media/types'
import { InfoRow }            from '@/components/media/InfoRow'
import { formatSize }         from '@/utils/media/formatSize'
import { showToast }          from '@/components/ui/Toast'
import { clsx }               from 'clsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const BUCKET_PUBLIC = `${SUPABASE_URL}/storage/v1/object/public/images`

/** Converts any string to a clean slug.  e.g. "ChatGPT Image" → "chatgpt-image" */
function slugifyFileName(raw: string): string {
  return raw
    .trim()
    .replace(/\.[^/.]+$/, '')           // strip extension — we re-add it
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')        // non-alphanum → dash
    .replace(/-+/g, '-')                // collapse consecutive dashes
    .replace(/^-|-$/g, '')             // trim leading/trailing dashes
    || 'image'
}

/** Returns the file extension from a filename, lowercased, with dot. e.g. ".webp" */
function getExt(fileName: string): string {
  const parts = fileName.split('.')
  if (parts.length < 2) return ''
  return `.${parts.pop()!.toLowerCase()}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  selected:   MediaItem
  setSelected: (item: MediaItem | null) => void
  editing:    boolean
  setEditing: (editing: boolean) => void
  editForm:   Partial<MediaItem>
  setEditForm: React.Dispatch<React.SetStateAction<Partial<MediaItem>>>
  savingMeta: boolean
  saveMeta:   () => void
  deleteItem: (item: MediaItem) => void
  copyUrl:    (url: string) => void
  /** Called after a successful rename so the parent can re-fetch items */
  onRenamed?: (updated: MediaItem) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MediaDetailsPanel({
  selected,
  setSelected,
  editing,
  setEditing,
  editForm,
  setEditForm,
  savingMeta,
  saveMeta,
  deleteItem,
  copyUrl,
  onRenamed,
}: Props) {
  const sb = getBrowserClient()

  // ── Rename state ─────────────────────────────────────────────────────────
  const [renamingFile,  setRenamingFile]  = useState(false)   // UI: editing name?
  const [renameInput,   setRenameInput]   = useState('')       // raw user input
  const [renameSaving,  setRenameSaving]  = useState(false)   // network in-flight?
  const [renameError,   setRenameError]   = useState<string | null>(null)

  const ext          = getExt(selected.file_name)             // e.g. ".webp"
  const slugPreview  = slugifyFileName(renameInput) + ext     // live slug preview

  // ── Open rename UI ────────────────────────────────────────────────────────
  const startRename = () => {
    // Pre-fill with current name minus extension
    setRenameInput(selected.file_name.replace(/\.[^/.]+$/, ''))
    setRenameError(null)
    setRenamingFile(true)
  }

  const cancelRename = () => {
    setRenamingFile(false)
    setRenameError(null)
  }

  // ── Execute rename: copy → delete → update DB ─────────────────────────────
  const saveRename = async () => {
    const newSlug = slugifyFileName(renameInput)
    if (!newSlug || newSlug === slugifyFileName(selected.file_name)) {
      setRenamingFile(false)
      return
    }

    const newFileName    = `${newSlug}${ext}`
    const folder         = selected.folder
    const oldPath        = selected.storage_path            // e.g. "blog/chatgpt.webp"
    const newPath        = `${folder}/${newFileName}`       // e.g. "blog/fiixup-hero.webp"

    // Guard: don't overwrite another file at the new path
    const { data: existing } = await sb
      .from('media_library')
      .select('id')
      .eq('storage_path', newPath)
      .maybeSingle()

    if (existing) {
      setRenameError(`A file named "${newFileName}" already exists in this folder.`)
      return
    }

    setRenameSaving(true)
    setRenameError(null)

    try {
      // 1. Copy to new path  (Supabase has no rename — copy+delete is the only way)
      const { error: copyErr } = await sb.storage
        .from('images')
        .copy(oldPath, newPath)

      if (copyErr) throw new Error(`Storage copy failed: ${copyErr.message}`)

      // 2. Delete old path
      const { error: delErr } = await sb.storage
        .from('images')
        .remove([oldPath])

      // Non-fatal — log but don't abort (the new file is already there)
      if (delErr) console.warn('Old file delete failed (non-fatal):', delErr.message)

      // 3. Update DB row
      const newPublicUrl = `${BUCKET_PUBLIC}/${newPath}`

      const { error: dbErr } = await sb
        .from('media_library')
        .update({
          storage_path: newPath,
          public_url:   newPublicUrl,
          file_name:    newFileName,
          updated_at:   new Date().toISOString(),
        })
        .eq('id', selected.id)

      if (dbErr) throw new Error(`DB update failed: ${dbErr.message}`)

      // 4. Update local state so panel reflects new name immediately
      const updated: MediaItem = {
        ...selected,
        storage_path: newPath,
        public_url:   newPublicUrl,
        file_name:    newFileName,
      }
      setSelected(updated)
      setRenamingFile(false)
      showToast('success', `Renamed to ${newFileName}`)
      onRenamed?.(updated)

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setRenameError(msg)
      showToast('error', msg)
    } finally {
      setRenameSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-80 flex-shrink-0 bg-[#111827] border-l border-[#1e2535] flex flex-col overflow-hidden">

      {/* Image preview */}
      <div className="relative bg-[#0f1117] aspect-video flex items-center justify-center flex-shrink-0">
        <img
          src={selected.public_url}
          alt={selected.alt_text ?? ''}
          className={selected.crop_mode === 'cover'
            ? 'w-full h-full object-cover'
            : 'max-w-full max-h-full object-contain p-2'}
          style={{ objectPosition: `${selected.focal_x ?? 50}% ${selected.focal_y ?? 50}%` }}
        />
        <button
          onClick={() => setSelected(null)}
          className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action bar */}
      <div className="flex gap-1.5 p-3 border-b border-[#1e2535]">
        <button
          onClick={() => copyUrl(selected.public_url)}
          className="admin-btn-secondary flex-1 justify-center text-xs py-1.5"
        >
          <Copy className="w-3.5 h-3.5" /> Copy URL
        </button>
        <a
          href={selected.public_url}
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn-secondary px-2.5 py-1.5"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={() => deleteItem(selected)}
          className="admin-btn-danger px-2.5 py-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* ── File Info ── */}
        <div className="bg-[#0f1117] rounded-xl p-3 space-y-2">
          <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">File Info</p>

          {/* ── Filename row with inline rename ── */}
          <div>
            {renamingFile ? (
              /* ── Rename edit mode ── */
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#6b7280] font-semibold uppercase tracking-wider w-14 flex-shrink-0">Name</span>
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="text"
                      value={renameInput}
                      onChange={e => { setRenameInput(e.target.value); setRenameError(null) }}
                      onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') cancelRename() }}
                      autoFocus
                      spellCheck={false}
                      placeholder="new-filename"
                      className="flex-1 bg-[#1a1d27] border border-blue-500/60 focus:border-blue-500 rounded-lg px-2 py-1 text-xs text-[#e2e8f0] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-colors min-w-0"
                    />
                    <span className="text-[10px] text-[#475569] flex-shrink-0">{ext}</span>
                  </div>
                </div>

                {/* Slug preview */}
                <div className="ml-[3.75rem] flex items-center gap-1.5">
                  <span className="text-[10px] text-[#374151]">→</span>
                  <span className={clsx(
                    'text-[10px] font-mono px-2 py-0.5 rounded-md',
                    slugPreview === selected.file_name
                      ? 'text-[#374151] bg-[#1a1d27]'
                      : 'text-blue-300 bg-blue-500/10'
                  )}>
                    {slugPreview}
                  </span>
                </div>

                {/* Error */}
                {renameError && (
                  <div className="ml-[3.75rem] flex items-start gap-1.5">
                    <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-red-400 leading-relaxed">{renameError}</p>
                  </div>
                )}

                {/* Save / Cancel */}
                <div className="ml-[3.75rem] flex gap-2">
                  <button
                    onClick={saveRename}
                    disabled={renameSaving || !renameInput.trim()}
                    className="flex items-center gap-1 text-[10px] font-semibold text-green-400 hover:text-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {renameSaving
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Check className="w-3 h-3" />
                    }
                    {renameSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={cancelRename}
                    disabled={renameSaving}
                    className="text-[10px] text-[#6b7280] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ── Normal display mode ── */
              <div className="flex items-start gap-1">
                <span className="text-[10px] text-[#6b7280] font-semibold uppercase tracking-wider w-14 flex-shrink-0 pt-0.5">Name</span>
                <div className="flex-1 flex items-start gap-1 min-w-0">
                  <span className="text-[10px] text-[#e2e8f0] font-mono break-all leading-relaxed flex-1">
                    {selected.file_name}
                  </span>
                  <button
                    onClick={startRename}
                    title="Rename file"
                    className="flex-shrink-0 text-[#374151] hover:text-blue-400 transition-colors mt-0.5 p-0.5 rounded"
                  >
                    <FileEdit className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <InfoRow label="Folder"    value={selected.folder} />
          <InfoRow label="Size"      value={formatSize(selected.file_size)} />
          <InfoRow label="Type"      value={selected.mime_type ?? '—'} />
          <InfoRow label="Path"      value={selected.storage_path} mono />
          <InfoRow label="Uploaded"  value={new Date(selected.created_at).toLocaleDateString('en-IN')} />
        </div>

        {/* ── Metadata section ── */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">Metadata</p>
          {!editing ? (
            <button
              onClick={() => { setEditing(true); setEditForm(selected) }}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={saveMeta}
                disabled={savingMeta}
                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
              >
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
                    value={String((editForm as Record<string, unknown>)[f.key] ?? '')}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    rows={2}
                    className="admin-textarea text-xs"
                  />
                ) : (
                  <input
                    type="text"
                    value={String((editForm as Record<string, unknown>)[f.key] ?? '')}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="admin-input text-xs"
                  />
                )}
              </div>
            ))}

            {/* Frontend crop settings */}
            <div className="rounded-xl border border-[#2a2d3e] bg-[#0f1117] p-3 space-y-3">
              <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">Frontend Crop Settings</p>
              <div>
                <label className="admin-label">Image Fit</label>
                <select
                  value={String((editForm as Record<string, unknown>).crop_mode ?? 'contain')}
                  onChange={e => setEditForm(p => ({ ...p, crop_mode: e.target.value }))}
                  className="admin-input text-xs"
                >
                  <option value="contain">Contain - show full image, no crop</option>
                  <option value="cover">Cover - fill box, may crop</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Crop Ratio Label</label>
                <select
                  value={String((editForm as Record<string, unknown>).crop_ratio ?? 'auto')}
                  onChange={e => setEditForm(p => ({ ...p, crop_ratio: e.target.value }))}
                  className="admin-input text-xs"
                >
                  <option value="auto">Auto / Original</option>
                  <option value="4:3">4:3 Blog/Social Safe</option>
                  <option value="16:9">16:9 Wide</option>
                  <option value="1:1">1:1 Square</option>
                  <option value="16:7">16:7 Desktop Hero</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="admin-label">
                    Focal X: {String((editForm as Record<string, unknown>).focal_x ?? 50)}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Number((editForm as Record<string, unknown>).focal_x ?? 50)}
                    onChange={e => setEditForm(p => ({ ...p, focal_x: Number(e.target.value) }))}
                    className="w-full accent-blue-500"
                  />
                </div>
                <div>
                  <label className="admin-label">
                    Focal Y: {String((editForm as Record<string, unknown>).focal_y ?? 50)}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Number((editForm as Record<string, unknown>).focal_y ?? 50)}
                    onChange={e => setEditForm(p => ({ ...p, focal_y: Number(e.target.value) }))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="admin-label">Tags (comma separated)</label>
              <input
                type="text"
                value={Array.isArray((editForm as Record<string, unknown>).tags)
                  ? ((editForm as Record<string, unknown>).tags as string[]).join(', ')
                  : ''}
                onChange={e => setEditForm(p => ({
                  ...p,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                }))}
                className="admin-input text-xs"
                placeholder="hero, bangalore, mechanic"
              />
            </div>

            <div>
              <label className="admin-label">Move to Folder</label>
              <select
                value={String((editForm as Record<string, unknown>).folder ?? 'general')}
                onChange={e => setEditForm(p => ({ ...p, folder: e.target.value }))}
                className="admin-input text-xs"
              >
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
            <InfoRow label="Image Fit"        value={selected.crop_mode ?? 'contain'} />
            <InfoRow label="Ratio"            value={selected.crop_ratio ?? 'auto'} />
            <InfoRow label="Focal Point"      value={`${selected.focal_x ?? 50}% / ${selected.focal_y ?? 50}%`} />
            {selected.tags?.length > 0 && (
              <div>
                <p className="text-[10px] text-[#6b7280] font-semibold uppercase tracking-wider mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-[#2a2d3e] text-[#94a3b8] px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
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
            <button
              onClick={() => copyUrl(selected.public_url)}
              className="flex-shrink-0 text-[#6b7280] hover:text-blue-400 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
