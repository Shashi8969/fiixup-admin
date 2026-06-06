export type MetaFieldType = 'title' | 'description'
export type MetaStatus = 'empty' | 'short' | 'good' | 'warning' | 'over'

export const META_LIMITS: Record<MetaFieldType, { min: number; idealMin: number; idealMax: number; max: number; label: string }> = {
  title:       { min: 40,  idealMin: 50,  idealMax: 60,  max: 65,  label: 'Meta title' },
  description: { min: 120, idealMin: 140, idealMax: 155, max: 160, label: 'Meta description' },
}

export function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length
}

export function getMetaStatus(value: string, type: MetaFieldType): MetaStatus {
  const len = value.length
  const limit = META_LIMITS[type]
  if (len === 0) return 'empty'
  if (len < limit.min) return 'short'
  if (len >= limit.idealMin && len <= limit.idealMax) return 'good'
  if (len <= limit.max) return 'warning'
  return 'over'
}

export function getMetaMessage(value: string, type: MetaFieldType) {
  const len = value.length
  const limit = META_LIMITS[type]
  const status = getMetaStatus(value, type)

  if (status === 'empty') return 'Empty'
  if (status === 'short') return `Too short — target ${limit.idealMin}-${limit.idealMax} characters`
  if (status === 'good') return 'Best SEO range'
  if (status === 'warning') return 'Acceptable, but getting long'
  return `Too long — Google may cut after ${limit.max} characters`
}

export function truncateForGoogle(value: string, type: MetaFieldType) {
  const max = type === 'title' ? 60 : 155
  if (value.length <= max) return value
  return `${value.slice(0, Math.max(0, max - 1)).trim()}…`
}

export function normalizeDisplayUrl(urlPath: string) {
  const cleaned = urlPath.trim().replace(/^https?:\/\/(www\.)?fiixup\.in\/?/i, '').replace(/^\/+/, '')
  if (!cleaned) return 'fiixup.in'
  return `fiixup.in › ${cleaned.split('/').filter(Boolean).join(' › ')}`
}
