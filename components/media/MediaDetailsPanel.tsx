'use client'

import { Copy, Edit2, ExternalLink, Loader2, Save, Trash2, X } from 'lucide-react'
import { FOLDERS, type MediaItem } from '@/components/media/types'
import { InfoRow } from '@/components/media/InfoRow'
import { formatSize } from '@/utils/media/formatSize'

type Props = {
  selected: MediaItem
  setSelected: (item: MediaItem | null) => void
  editing: boolean
  setEditing: (editing: boolean) => void
  editForm: Partial<MediaItem>
  setEditForm: React.Dispatch<React.SetStateAction<Partial<MediaItem>>>
  savingMeta: boolean
  saveMeta: () => void
  deleteItem: (item: MediaItem) => void
  copyUrl: (url: string) => void
}

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
}: Props) {
  return (
    <div className="w-80 flex-shrink-0 bg-[#111827] border-l border-[#1e2535] flex flex-col overflow-hidden">
      <div className="relative bg-[#0f1117] aspect-video flex items-center justify-center flex-shrink-0">
        <img src={selected.public_url} alt={selected.alt_text ?? ''}
          className={selected.crop_mode === 'cover' ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain p-2'}
          style={{ objectPosition: `${selected.focal_x ?? 50}% ${selected.focal_y ?? 50}%` }} />
        <button onClick={() => setSelected(null)}
          className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

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

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="bg-[#0f1117] rounded-xl p-3 space-y-1.5">
          <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">File Info</p>
          <InfoRow label="Name"   value={selected.file_name} />
          <InfoRow label="Folder" value={selected.folder} />
          <InfoRow label="Size"   value={formatSize(selected.file_size)} />
          <InfoRow label="Type"   value={selected.mime_type ?? '—'} />
          <InfoRow label="Path"   value={selected.storage_path} mono />
          <InfoRow label="Uploaded" value={new Date(selected.created_at).toLocaleDateString('en-IN')} />
        </div>

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
            <div className="rounded-xl border border-[#2a2d3e] bg-[#0f1117] p-3 space-y-3">
              <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">Frontend Crop Settings</p>
              <div>
                <label className="admin-label">Image Fit</label>
                <select value={String((editForm as Record<string,unknown>).crop_mode ?? 'contain')} onChange={e => setEditForm(p => ({ ...p, crop_mode: e.target.value }))} className="admin-input text-xs">
                  <option value="contain">Contain - show full image, no crop</option>
                  <option value="cover">Cover - fill box, may crop</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Crop Ratio Label</label>
                <select value={String((editForm as Record<string,unknown>).crop_ratio ?? 'auto')} onChange={e => setEditForm(p => ({ ...p, crop_ratio: e.target.value }))} className="admin-input text-xs">
                  <option value="auto">Auto / Original</option>
                  <option value="4:3">4:3 Blog/Social Safe</option>
                  <option value="16:9">16:9 Wide</option>
                  <option value="1:1">1:1 Square</option>
                  <option value="16:7">16:7 Desktop Hero</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="admin-label">Focal X: {String((editForm as Record<string,unknown>).focal_x ?? 50)}%</label>
                  <input type="range" min={0} max={100} value={Number((editForm as Record<string,unknown>).focal_x ?? 50)} onChange={e => setEditForm(p => ({ ...p, focal_x: Number(e.target.value) }))} className="w-full accent-blue-500" />
                </div>
                <div>
                  <label className="admin-label">Focal Y: {String((editForm as Record<string,unknown>).focal_y ?? 50)}%</label>
                  <input type="range" min={0} max={100} value={Number((editForm as Record<string,unknown>).focal_y ?? 50)} onChange={e => setEditForm(p => ({ ...p, focal_y: Number(e.target.value) }))} className="w-full accent-blue-500" />
                </div>
              </div>
            </div>

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
            <InfoRow label="Image Fit" value={selected.crop_mode ?? 'contain'} />
            <InfoRow label="Ratio" value={selected.crop_ratio ?? 'auto'} />
            <InfoRow label="Focal Point" value={`${selected.focal_x ?? 50}% / ${selected.focal_y ?? 50}%`} />
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
  )
}
