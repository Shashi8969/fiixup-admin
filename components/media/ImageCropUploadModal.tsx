'use client'
/**
 * ImageCropUploadModal.tsx
 *
 * Drop-in modal for crop → compress → upload workflow.
 * Usage in MediaLibraryPage:
 *
 *   import { ImageCropUploadModal } from '@/components/media/ImageCropUploadModal'
 *
 *   {showCropUpload && (
 *     <ImageCropUploadModal
 *       uploadFolder={uploadFolder}
 *       onSuccess={(item) => { fetchItems(); setShowCropUpload(false) }}
 *       onClose={() => setShowCropUpload(false)}
 *     />
 *   )}
 *
 * Requires:
 *   npm install cropperjs
 *   (or the CDN <script> approach — see bottom of this file for CDN option)
 *
 * Supabase table columns used: storage_path, public_url, folder, file_name,
 * file_size, mime_type, width, height, title, alt_text, crop_mode, crop_ratio
 *
 * Pass allowOriginal to also offer "upload as-is" (original bytes, original
 * dimensions, original format — no crop, no WebP recompression). Used for
 * assets like brand logos where the source PNG must stay pixel-exact.
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ChangeEvent,
} from 'react'
import Cropper from 'cropperjs'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { cleanFileBaseName } from '@/utils/media/webpCompressor'
import { formatSize } from '@/utils/media/formatSize'
import { Upload, X, Crop, ImageIcon, Loader2, RefreshCw, Check } from 'lucide-react'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CropPreset = {
  id: string
  label: string
  /** e.g. 16/9. null = freeform */
  ratio: number | null
  /** Suggested quality for this use-case */
  defaultQuality: number
  /** Suggested max dimension (width) for upload */
  maxWidth: number
}

export const CROP_PRESETS: CropPreset[] = [
  { id: 'hero',      label: 'Hero Banner',      ratio: 16 / 9,  defaultQuality: 78, maxWidth: 1600 },
  { id: 'about',     label: 'About / Team',     ratio: 4 / 3,   defaultQuality: 82, maxWidth: 1200 },
  { id: 'blog',      label: 'Blog Thumbnail',   ratio: 16 / 9,  defaultQuality: 80, maxWidth: 800  },
  { id: 'service',   label: 'Service Hero',     ratio: 3 / 1,   defaultQuality: 78, maxWidth: 1400 },
  { id: 'logo',      label: 'Brand Logo',       ratio: null,    defaultQuality: 92, maxWidth: 400  },
  { id: 'gallery',   label: 'Gallery Photo',    ratio: 4 / 3,   defaultQuality: 80, maxWidth: 1400 },
  { id: 'freeform',  label: 'Freeform',         ratio: null,    defaultQuality: 82, maxWidth: 1600 },
]

export type UploadedMediaItem = {
  id: string
  storage_path: string
  public_url: string
  file_name: string
  file_size: number
  width: number | null
  height: number | null
}

type Stage = 'select' | 'crop' | 'compress' | 'uploading' | 'done'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const BUCKET_PUBLIC = `${SUPABASE_URL}/storage/v1/object/public/images`

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function canvasToWebpBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/webp',
      quality / 100,
    )
  })
}

function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

function getExtension(filename: string, fallback: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename)
  return match ? match[1].toLowerCase() : fallback
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  /** Target Supabase Storage folder, e.g. "blog" | "cities" | "general" */
  uploadFolder: string
  /**
   * If provided, the uploaded file will overwrite this exact storage path.
   * Useful when replacing an existing image without breaking DB references.
   */
  overwritePath?: string
  /**
   * Also offer "upload as-is" — original bytes, original dimensions, original
   * format, no crop or recompression. For assets like brand logos where the
   * source PNG must stay pixel-exact (e.g. transparent background artwork).
   */
  allowOriginal?: boolean
  onSuccess: (item: UploadedMediaItem) => void
  onClose: () => void
}

export function ImageCropUploadModal({ uploadFolder, overwritePath, allowOriginal = false, onSuccess, onClose }: Props) {
  const sb = getBrowserClient()

  // ── Stage machine ──────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>('select')

  // ── File selection ─────────────────────────────────────────────────────────
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const originalFileInputRef = useRef<HTMLInputElement>(null)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourceUrl,  setSourceUrl]  = useState<string>('')   // object URL for cropper
  const [originalMode, setOriginalMode] = useState(false)    // true = skip crop/compress, upload original bytes

  // ── Crop ───────────────────────────────────────────────────────────────────
  const imgRef     = useRef<HTMLImageElement>(null)
  const cropperRef = useRef<Cropper | null>(null)
  const [preset,   setPreset]   = useState<CropPreset>(CROP_PRESETS[0])
  const [cropDone, setCropDone] = useState(false)

  // ── Compress ───────────────────────────────────────────────────────────────
  const [quality,       setQuality]       = useState(preset.defaultQuality)
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null)
  const [previewUrl,    setPreviewUrl]    = useState<string>('')
  const [croppedCanvas, setCroppedCanvas] = useState<HTMLCanvasElement | null>(null)
  const [compressing,   setCompressing]   = useState(false)
  const [outputDims,    setOutputDims]    = useState<{ w: number; h: number } | null>(null)

  // ── Upload ─────────────────────────────────────────────────────────────────
  const [altText, setAltText] = useState('')
  const [title,   setTitle]   = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError,    setUploadError]    = useState<string | null>(null)

  // ─── Clean up object URLs on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (sourceUrl)  URL.revokeObjectURL(sourceUrl)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [])

  // ─── Initialize Cropper when we enter the crop stage ──────────────────────
  useEffect(() => {
    if (stage !== 'crop' || !imgRef.current) return

    cropperRef.current?.destroy()

    const cropper = new Cropper(imgRef.current, {
      aspectRatio: preset.ratio ?? NaN,
      viewMode: 1,
      autoCropArea: 0.9,
      movable: true,
      zoomable: true,
      scalable: false,
      rotatable: false,
      background: false,
      guides: true,
      center: true,
      highlight: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
    })
    cropperRef.current = cropper

    return () => { cropper.destroy() }
  }, [stage, preset])  // re-init when preset changes (ratio may change)

  // ─── Re-compress when quality changes (debounced) ─────────────────────────
  const compressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const recompress = useCallback(async (canvas: HTMLCanvasElement, q: number) => {
    setCompressing(true)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    try {
      const blob = await canvasToWebpBlob(canvas, q)
      const url  = blobToObjectUrl(blob)
      setCompressedBlob(blob)
      setPreviewUrl(url)
      setOutputDims({ w: canvas.width, h: canvas.height })
    } catch (e) {
      showToast('error', 'Compression failed')
    } finally {
      setCompressing(false)
    }
  }, [])

  useEffect(() => {
    if (stage !== 'compress' || !croppedCanvas) return
    if (compressTimeout.current) clearTimeout(compressTimeout.current)
    compressTimeout.current = setTimeout(() => {
      recompress(croppedCanvas, quality)
    }, 120)
  }, [quality, croppedCanvas, stage])

  // ─── File select ──────────────────────────────────────────────────────────
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select an image file')
      return
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    const url = URL.createObjectURL(file)
    setSourceFile(file)
    setSourceUrl(url)
    setTitle(cleanFileBaseName(file.name))
    setCropDone(false)
    setCompressedBlob(null)
    setOriginalMode(false)
    setStage('crop')
  }

  // ─── Original (as-is) file select — no crop, no recompression ─────────────
  const handleOriginalFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select an image file')
      return
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    const url = URL.createObjectURL(file)
    setOriginalMode(true)
    setSourceFile(file)
    setSourceUrl(url)
    setTitle(cleanFileBaseName(file.name))
    setCompressedBlob(file)   // upload payload is the original file's bytes, untouched
    setPreviewUrl(url)
    setOutputDims(null)

    const img = new Image()
    img.onload = () => setOutputDims({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = url

    setStage('compress')
  }

  // ─── Change preset mid-crop ───────────────────────────────────────────────
  const handlePresetChange = (p: CropPreset) => {
    setPreset(p)
    setQuality(p.defaultQuality)
    setCropDone(false)
    if (cropperRef.current) {
      cropperRef.current.setAspectRatio(p.ratio ?? NaN)
    }
  }

  // ─── Confirm crop → generate scaled canvas → enter compress stage ─────────
  const handleConfirmCrop = useCallback(async () => {
    const cropper = cropperRef.current
    if (!cropper) return

    const rawCanvas = cropper.getCroppedCanvas()

    // Scale down if wider than maxWidth
    const maxW  = preset.maxWidth
    const scale = Math.min(1, maxW / rawCanvas.width)
    const tw    = Math.round(rawCanvas.width  * scale)
    const th    = Math.round(rawCanvas.height * scale)

    const scaled = document.createElement('canvas')
    scaled.width  = tw
    scaled.height = th
    const ctx = scaled.getContext('2d')
    if (!ctx) { showToast('error', 'Canvas error'); return }
    ctx.drawImage(rawCanvas, 0, 0, tw, th)

    setCroppedCanvas(scaled)
    setCropDone(true)
    setQuality(preset.defaultQuality)
    setStage('compress')

    // Trigger first compression
    const blob = await canvasToWebpBlob(scaled, preset.defaultQuality)
    const url  = blobToObjectUrl(blob)
    setCompressedBlob(blob)
    setPreviewUrl(url)
    setOutputDims({ w: tw, h: th })
  }, [preset])

  // ─── Upload to Supabase ───────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!compressedBlob || !sourceFile) return
    setUploadError(null)
    setStage('uploading')

    try {
      const baseName  = cleanFileBaseName(title || sourceFile.name)
      const ext        = originalMode ? getExtension(sourceFile.name, 'png') : 'webp'
      const fileName  = `${baseName}.${ext}`
      const storagePath = overwritePath ?? `${uploadFolder}/${fileName}`
      const contentType = originalMode ? (sourceFile.type || 'image/png') : 'image/webp'

      setUploadProgress(20)

      // 1. Upload (upsert=true so we can overwrite existing path without 409)
      const { error: storageErr } = await sb.storage
        .from('images')
        .upload(storagePath, compressedBlob, {
          contentType,
          cacheControl: '3600',
          upsert: true,           // ← overwrites existing file at same path
        })

      if (storageErr) throw storageErr

      setUploadProgress(60)

      const publicUrl = `${BUCKET_PUBLIC}/${storagePath}`

      // 2. Upsert media_library row (use storage_path as unique key)
      const { data: dbRow, error: dbErr } = await sb
        .from('media_library')
        .upsert(
          {
            storage_path:  storagePath,
            public_url:    publicUrl,
            folder:        uploadFolder,
            file_name:     fileName,
            file_size:     compressedBlob.size,
            mime_type:     contentType,
            width:         outputDims?.w ?? null,
            height:        outputDims?.h ?? null,
            title:         title || baseName,
            alt_text:      altText,
            crop_mode:     originalMode ? 'original' : 'cover',
            crop_ratio:    originalMode ? 'original' : (preset.ratio ? `${preset.id}` : 'auto'),
            focal_x:       50,
            focal_y:       50,
            updated_at:    new Date().toISOString(),
          },
          { onConflict: 'storage_path', ignoreDuplicates: false }
        )
        .select('id, storage_path, public_url, file_name, file_size, width, height')
        .single()

      if (dbErr) throw dbErr

      setUploadProgress(100)
      setStage('done')
      showToast('success', `${fileName} uploaded successfully`)
      onSuccess(dbRow as UploadedMediaItem)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setUploadError(msg)
      showToast('error', `Upload failed: ${msg}`)
      setStage('compress')
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative bg-[#111827] border border-[#1e2535] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2535] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Crop className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e2e8f0]">{originalMode ? 'Upload Image' : 'Crop & Upload'}</h2>
              <p className="text-xs text-[#6b7280]">
                {stage === 'select'   && 'Choose an image to begin'}
                {stage === 'crop'     && `Cropping for ${preset.label}`}
                {stage === 'compress' && (originalMode ? 'Review before uploading — original file, no compression' : 'Adjust quality before uploading')}
                {stage === 'uploading'&& 'Uploading to Supabase…'}
                {stage === 'done'     && 'Upload complete!'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white p-1.5 rounded-lg hover:bg-[#1e2535] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Stage progress bar ── */}
        <div className="flex gap-0 flex-shrink-0">
          {(['select', 'crop', 'compress', 'uploading'] as Stage[]).map((s, i) => (
            <div
              key={s}
              className={clsx(
                'h-0.5 flex-1 transition-colors duration-300',
                (['select', 'crop', 'compress', 'uploading', 'done'] as Stage[]).indexOf(stage) > i
                  ? 'bg-blue-500'
                  : stage === s ? 'bg-blue-400' : 'bg-[#1e2535]'
              )}
            />
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── SELECT STAGE ── */}
          {stage === 'select' && (
            <div className="flex flex-col items-center justify-center h-72 gap-4 px-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-sm border-2 border-dashed border-[#2a2d3e] hover:border-blue-500 rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors group"
              >
                <div className="w-14 h-14 rounded-full bg-[#1a1d27] group-hover:bg-blue-600/10 flex items-center justify-center transition-colors">
                  <ImageIcon className="w-7 h-7 text-[#6b7280] group-hover:text-blue-400 transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#e2e8f0]">Choose an image</p>
                  <p className="text-xs text-[#6b7280] mt-1">PNG, JPG, WebP up to 50MB</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />

              {allowOriginal && (
                <>
                  <p className="text-xs text-[#374151]">or</p>
                  <button
                    type="button"
                    onClick={() => originalFileInputRef.current?.click()}
                    className="text-xs font-medium text-blue-400 underline decoration-dotted underline-offset-4 transition-colors hover:text-blue-300"
                  >
                    Upload PNG as-is — original size, no crop or compression
                  </button>
                  <input
                    ref={originalFileInputRef}
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={handleOriginalFileSelect}
                  />
                </>
              )}
            </div>
          )}

          {/* ── CROP STAGE ── */}
          {stage === 'crop' && (
            <div className="flex flex-col md:flex-row gap-0 h-[520px]">

              {/* Cropper.js v2 ships no external CSS — required styles injected inline */}
              <style>{`.cropper-container{direction:ltr;font-size:0;line-height:0;position:relative;touch-action:none;user-select:none}.cropper-container img{display:block;height:100%;image-orientation:0deg;max-height:none!important;max-width:none!important;min-height:0!important;min-width:0!important;width:100%}.cropper-wrap-box,.cropper-canvas,.cropper-drag-box,.cropper-crop-box,.cropper-modal{bottom:0;left:0;position:absolute;right:0;top:0}.cropper-wrap-box,.cropper-canvas{overflow:hidden}.cropper-drag-box{background-color:#fff;cursor:crosshair;opacity:0}.cropper-modal{background-color:#000;opacity:.5}.cropper-view-box{display:block;height:100%;outline:1px solid #39f;outline-color:rgba(51,153,255,.75);overflow:hidden;width:100%}.cropper-dashed{border:0 dashed #eee;display:block;opacity:.5;position:absolute}.cropper-dashed.dashed-h{border-bottom-width:1px;border-top-width:1px;height:33.33333%;left:0;top:33.33333%;width:100%}.cropper-dashed.dashed-v{border-left-width:1px;border-right-width:1px;height:100%;left:33.33333%;top:0;width:33.33333%}.cropper-center{display:block;height:0;left:50%;opacity:.75;position:absolute;top:50%;width:0}.cropper-center::before,.cropper-center::after{background-color:#eee;content:" ";display:block;position:absolute}.cropper-center::before{height:1px;left:-3px;top:0;width:7px}.cropper-center::after{height:7px;left:0;top:-3px;width:1px}.cropper-face,.cropper-line,.cropper-point{display:block;height:100%;opacity:.1;position:absolute;width:100%}.cropper-face{background-color:#fff;left:0;top:0}.cropper-line{background-color:#39f}.cropper-line.line-e{cursor:ew-resize;right:-3px;top:0;width:5px}.cropper-line.line-n{cursor:ns-resize;height:5px;left:0;top:-3px}.cropper-line.line-w{cursor:ew-resize;left:-3px;top:0;width:5px}.cropper-line.line-s{bottom:-3px;cursor:ns-resize;height:5px;left:0}.cropper-point{background-color:#39f;height:5px;opacity:.75;width:5px}.cropper-point.point-e{cursor:ew-resize;margin-top:-3px;right:-3px;top:50%}.cropper-point.point-n{cursor:ns-resize;left:50%;margin-left:-3px;top:-3px}.cropper-point.point-w{cursor:ew-resize;left:-3px;margin-top:-3px;top:50%}.cropper-point.point-s{bottom:-3px;cursor:s-resize;left:50%;margin-left:-3px}.cropper-point.point-ne{cursor:nesw-resize;right:-3px;top:-3px}.cropper-point.point-nw{cursor:nwse-resize;left:-3px;top:-3px}.cropper-point.point-sw{bottom:-3px;cursor:nesw-resize;left:-3px}.cropper-point.point-se{bottom:-3px;cursor:nwse-resize;height:20px;opacity:1;right:-3px;width:20px}.cropper-point.point-se::before{background-color:#39f;bottom:-50%;content:" ";display:block;height:200%;opacity:0;position:absolute;right:-50%;width:200%}.cropper-hidden{display:none!important}.cropper-move{cursor:move}.cropper-crop{cursor:crosshair}.cropper-disabled .cropper-drag-box,.cropper-disabled .cropper-face,.cropper-disabled .cropper-line,.cropper-disabled .cropper-point{cursor:not-allowed}`}</style>

              {/* Cropper canvas area */}
              <div className="flex-1 relative bg-[#0d1117] flex items-center justify-center overflow-hidden min-h-[300px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={sourceUrl}
                  alt="Crop preview"
                  className="max-w-full max-h-full block"
                  style={{ maxHeight: '460px' }}
                />
              </div>

              {/* Crop controls sidebar */}
              <div className="w-full md:w-64 bg-[#0f1117] border-t md:border-t-0 md:border-l border-[#1e2535] flex flex-col p-5 gap-5 flex-shrink-0">

                {/* Preset selector */}
                <div>
                  <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2.5">Aspect Ratio</p>
                  <div className="space-y-1.5">
                    {CROP_PRESETS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handlePresetChange(p)}
                        className={clsx(
                          'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm border transition-all',
                          preset.id === p.id
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                            : 'border-[#2a2d3e] text-[#94a3b8] hover:border-[#3a4060] hover:text-white'
                        )}
                      >
                        <span>{p.label}</span>
                        <span className="text-xs opacity-60">
                          {p.ratio ? `${Math.round(p.ratio * 9)}:${9}` : 'Free'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tip */}
                <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-3 text-xs text-[#6b7280] leading-relaxed">
                  <span className="text-blue-400 font-semibold">Tip:</span> Drag the crop box or zoom with scroll wheel. The image will be scaled to {preset.maxWidth}px max width.
                </div>

                {/* Confirm crop */}
                <button
                  onClick={handleConfirmCrop}
                  className="mt-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Confirm Crop
                </button>

                {/* Re-select */}
                <button
                  onClick={() => { setStage('select'); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="text-xs text-[#6b7280] hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Choose different image
                </button>
              </div>
            </div>
          )}

          {/* ── COMPRESS STAGE ── */}
          {stage === 'compress' && (
            <div className="flex flex-col md:flex-row gap-0 min-h-[480px]">

              {/* Preview panel */}
              <div className="flex-1 bg-[#0d1117] flex items-center justify-center p-6 relative min-h-[260px]">
                {compressing && (
                  <div className="absolute inset-0 bg-[#0d1117]/80 flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  </div>
                )}
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Compressed preview"
                    className="max-w-full max-h-[380px] object-contain rounded-xl shadow-lg"
                  />
                )}
              </div>

              {/* Controls sidebar */}
              <div className="w-full md:w-72 bg-[#0f1117] border-t md:border-t-0 md:border-l border-[#1e2535] flex flex-col p-5 gap-5 flex-shrink-0">

                {/* Live size badge */}
                <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-4 flex flex-col items-center gap-1">
                  <p className="text-xs text-[#6b7280] font-medium">{originalMode ? 'Original size' : 'Output size'}</p>
                  <p className={clsx(
                    'text-3xl font-black tabular-nums',
                    originalMode ? 'text-blue-400' :
                    compressedBlob && compressedBlob.size < 80_000 ? 'text-green-400' :
                    compressedBlob && compressedBlob.size < 150_000 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {compressedBlob ? formatSize(compressedBlob.size) : '—'}
                  </p>
                  {outputDims && (
                    <p className="text-xs text-[#475569]">
                      {outputDims.w} × {outputDims.h} px · {originalMode ? getExtension(sourceFile?.name ?? '', 'png').toUpperCase() : 'WebP'}
                    </p>
                  )}
                  {originalMode ? (
                    <p className="text-[10px] text-[#374151] mt-1">Uploaded exactly as selected — no resize or recompression.</p>
                  ) : (
                    <p className="text-[10px] text-[#374151] mt-1">Target: 50–80 KB</p>
                  )}
                </div>

                {!originalMode && (
                  <>
                    {/* Quality slider */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Quality</p>
                        <span className="text-sm font-black text-blue-400 tabular-nums">{quality}%</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={100}
                        step={1}
                        value={quality}
                        onChange={e => setQuality(Number(e.target.value))}
                        className="w-full h-2 rounded-full bg-[#2a2d3e] appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500
                          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500
                          [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #2563eb ${quality}%, #2a2d3e ${quality}%)`
                        }}
                      />
                      <div className="flex justify-between text-[10px] text-[#374151] mt-1">
                        <span>Smaller file</span>
                        <span>Better quality</span>
                      </div>
                    </div>

                    {/* Quick presets */}
                    <div>
                      <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Quick presets</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: 'Web', q: 72, hint: '~40 KB' },
                          { label: 'Balanced', q: 82, hint: '~60 KB' },
                          { label: 'HQ', q: 92, hint: '~100 KB' },
                        ].map(p => (
                          <button
                            key={p.label}
                            onClick={() => setQuality(p.q)}
                            className={clsx(
                              'flex flex-col items-center py-2 rounded-xl text-xs border transition-all',
                              quality === p.q
                                ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                                : 'border-[#2a2d3e] text-[#6b7280] hover:border-[#3a4060] hover:text-white'
                            )}
                          >
                            <span className="font-semibold">{p.label}</span>
                            <span className="text-[10px] opacity-60">{p.hint}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Alt text */}
                <div>
                  <label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2 block">
                    Alt Text
                  </label>
                  <input
                    type="text"
                    value={altText}
                    onChange={e => setAltText(e.target.value)}
                    placeholder="Describe the image…"
                    className="w-full bg-[#1a1d27] border border-[#2a2d3e] rounded-xl px-3 py-2 text-sm text-[#e2e8f0] placeholder:text-[#374151] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                  />
                </div>

                {/* Title / filename */}
                <div>
                  <label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2 block">
                    File name
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="my-image"
                      className="flex-1 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl px-3 py-2 text-sm text-[#e2e8f0] placeholder:text-[#374151] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                    />
                    <span className="text-xs text-[#374151] flex-shrink-0">
                      .{originalMode ? getExtension(sourceFile?.name ?? '', 'png') : 'webp'}
                    </span>
                  </div>
                </div>

                {/* Folder badge */}
                <div className="flex items-center gap-2 text-xs text-[#475569]">
                  <span className="text-[#374151]">Uploading to:</span>
                  <span className="bg-[#1a1d27] border border-[#2a2d3e] px-2 py-0.5 rounded-full text-[#94a3b8]">
                    {uploadFolder}/
                  </span>
                </div>

                {/* Upload button */}
                <button
                  onClick={handleUpload}
                  disabled={compressing || !compressedBlob}
                  className="mt-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {originalMode ? 'Upload As-Is' : 'Save & Upload'}
                </button>

                {/* Back / re-select */}
                {originalMode ? (
                  <button
                    onClick={() => {
                      setStage('select')
                      setOriginalMode(false)
                      if (originalFileInputRef.current) originalFileInputRef.current.value = ''
                    }}
                    className="text-xs text-[#6b7280] hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Choose different image
                  </button>
                ) : (
                  <button
                    onClick={() => setStage('crop')}
                    className="text-xs text-[#6b7280] hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Crop className="w-3 h-3" /> Back to crop
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── UPLOADING STAGE ── */}
          {stage === 'uploading' && (
            <div className="flex flex-col items-center justify-center h-72 gap-6 px-6">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
              <div className="w-full max-w-xs">
                <div className="h-2 bg-[#1e2535] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-[#6b7280] text-center mt-3">Uploading to Supabase Storage…</p>
              </div>
            </div>
          )}

          {/* ── DONE STAGE ── */}
          {stage === 'done' && (
            <div className="flex flex-col items-center justify-center h-72 gap-4 px-6">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-[#e2e8f0]">Uploaded successfully!</p>
                <p className="text-sm text-[#6b7280] mt-1">
                  {compressedBlob ? formatSize(compressedBlob.size) : ''} · {outputDims ? `${outputDims.w}×${outputDims.h}` : ''} · {originalMode ? getExtension(sourceFile?.name ?? '', 'png').toUpperCase() : 'WebP'}
                </p>
              </div>
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Uploaded"
                  className="w-32 h-20 object-cover rounded-xl border border-[#2a2d3e] shadow-lg"
                />
              )}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => {
                    setStage('select')
                    setSourceFile(null)
                    setCompressedBlob(null)
                    setCroppedCanvas(null)
                    setAltText('')
                    setTitle('')
                    setOriginalMode(false)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                    if (originalFileInputRef.current) originalFileInputRef.current.value = ''
                  }}
                  className="text-sm text-[#6b7280] hover:text-white border border-[#2a2d3e] hover:border-[#3a4060] px-4 py-2 rounded-xl transition-colors"
                >
                  Upload another
                </button>
                <button
                  onClick={onClose}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Error bar ── */}
        {uploadError && (
          <div className="flex items-center gap-3 px-5 py-3 bg-red-900/20 border-t border-red-800/40 text-sm text-red-400 flex-shrink-0">
            <X className="w-4 h-4 flex-shrink-0" />
            {uploadError}
            <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}