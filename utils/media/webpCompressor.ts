export type WebpCompressionSettings = {
  enabled: boolean
  quality: number
  maxWidth: number
}

export type PreparedImageUpload = {
  file: File
  originalFile: File
  fileName: string
  originalFileName: string
  originalSize: number
  finalSize: number
  mimeType: string
  width: number | null
  height: number | null
  convertedToWebp: boolean
}

export const DEFAULT_WEBP_COMPRESSION_SETTINGS: WebpCompressionSettings = {
  enabled: false,
  quality: 82,
  maxWidth: 1600,
}

const WEBP_SOURCE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg'])

export function canConvertToWebp(file: File) {
  return WEBP_SOURCE_MIME_TYPES.has(file.type.toLowerCase())
}

export function cleanFileBaseName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .trim()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'image'
}

export function getFileExtension(fileName: string, fallback = 'jpg') {
  return fileName.split('.').pop()?.toLowerCase() || fallback
}

export function buildUploadFileName(file: File, convertedToWebp: boolean) {
  const base = cleanFileBaseName(file.name)
  if (convertedToWebp) return `${base}.webp`
  return `${base}.${getFileExtension(file.name)}`
}

export async function getImageSize(file: File): Promise<{ width: number | null; height: number | null }> {
  if (typeof window === 'undefined') return { width: null, height: null }

  return new Promise((resolve) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ width: null, height: null })
    }

    img.src = objectUrl
  })
}

export async function compressImageToWebp(
  file: File,
  settings: WebpCompressionSettings,
): Promise<PreparedImageUpload> {
  if (!settings.enabled || !canConvertToWebp(file) || typeof window === 'undefined') {
    const size = await getImageSize(file)
    return {
      file,
      originalFile: file,
      fileName: buildUploadFileName(file, false),
      originalFileName: file.name,
      originalSize: file.size,
      finalSize: file.size,
      mimeType: file.type,
      width: size.width,
      height: size.height,
      convertedToWebp: false,
    }
  }

  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const scale = Math.min(1, settings.maxWidth / img.naturalWidth)
      const width = Math.round(img.naturalWidth * scale)
      const height = Math.round(img.naturalHeight * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Unable to prepare image canvas.'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('WebP compression failed.'))
            return
          }

          const fileName = buildUploadFileName(file, true)
          const webpFile = new File([blob], fileName, {
            type: 'image/webp',
            lastModified: Date.now(),
          })

          resolve({
            file: webpFile,
            originalFile: file,
            fileName,
            originalFileName: file.name,
            originalSize: file.size,
            finalSize: webpFile.size,
            mimeType: 'image/webp',
            width,
            height,
            convertedToWebp: true,
          })
        },
        'image/webp',
        settings.quality / 100,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error(`Unable to read ${file.name}`))
    }

    img.src = objectUrl
  })
}

export function formatCompressionSaving(originalSize: number, finalSize: number) {
  if (!originalSize || finalSize >= originalSize) return '0%'
  return `${Math.round((1 - finalSize / originalSize) * 100)}%`
}
