'use client'

import type { RefObject } from 'react'
import { clsx } from 'clsx'
import { Loader2, Upload, X, Zap } from 'lucide-react'
import { FOLDERS, type UploadForm, type WebpUploadSettings } from '@/components/media/types'

type Props = {
  fileRef: RefObject<HTMLInputElement | null>
  uploadFolder: string
  setUploadFolder: (folder: string) => void
  uploadForm: UploadForm
  setUploadForm: React.Dispatch<React.SetStateAction<UploadForm>>
  webpSettings: WebpUploadSettings
  setWebpSettings: React.Dispatch<React.SetStateAction<WebpUploadSettings>>
  uploading: boolean
  onClose: () => void
  onUpload: (files: FileList | null) => void
}

export function MediaUploadModal({
  fileRef,
  uploadFolder,
  setUploadFolder,
  uploadForm,
  setUploadForm,
  webpSettings,
  setWebpSettings,
  uploading,
  onClose,
  onUpload,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-[#1e2535] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between p-5 border-b border-[#1e2535]">
          <h2 className="text-base font-bold text-[#e2e8f0]">Upload Image</h2>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
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

          <div className="rounded-xl border border-[#2a2d3e] bg-[#0f1117] p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#e2e8f0]">Compress PNG/JPG to WebP</p>
                  <p className="text-xs text-[#6b7280] mt-0.5">
                    Keeps the same file name base and uploads as .webp. Example: car-photo.png → car-photo.webp
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setWebpSettings(p => ({ ...p, enabled: !p.enabled }))}
                className={clsx(
                  'w-11 h-6 rounded-full border transition-all relative flex-shrink-0',
                  webpSettings.enabled
                    ? 'bg-amber-500 border-amber-400'
                    : 'bg-[#1a1d27] border-[#2a2d3e]'
                )}>
                <span className={clsx(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all',
                  webpSettings.enabled ? 'left-5' : 'left-0.5'
                )} />
              </button>
            </div>

            {webpSettings.enabled && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1e2535]">
                <div>
                  <label className="admin-label mb-1 block">
                    Quality: <span className="text-white">{webpSettings.quality}%</span>
                  </label>
                  <input
                    type="range"
                    min={40}
                    max={95}
                    value={webpSettings.quality}
                    onChange={e => setWebpSettings(p => ({ ...p, quality: Number(e.target.value) }))}
                    className="w-full h-1.5 rounded accent-amber-400"
                  />
                  <div className="flex justify-between text-xs text-[#6b7280] mt-0.5"><span>Smaller</span><span>Sharper</span></div>
                </div>

                <div>
                  <label className="admin-label mb-1 block">
                    Max width: <span className="text-white">{webpSettings.maxWidth}px</span>
                  </label>
                  <input
                    type="range"
                    min={400}
                    max={2400}
                    step={100}
                    value={webpSettings.maxWidth}
                    onChange={e => setWebpSettings(p => ({ ...p, maxWidth: Number(e.target.value) }))}
                    className="w-full h-1.5 rounded accent-amber-400"
                  />
                  <div className="flex justify-between text-xs text-[#6b7280] mt-0.5"><span>400px</span><span>2400px</span></div>
                </div>
              </div>
            )}
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); onUpload(e.dataTransfer.files) }}
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
                <p className="text-xs text-[#6b7280] mt-1">
                  {webpSettings.enabled
                    ? 'PNG/JPG will upload as WebP with same name · WebP/GIF stay original'
                    : 'JPG, PNG, WebP, GIF — max 50MB · Multiple files supported'}
                </p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => onUpload(e.target.files)} />

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
  )
}
