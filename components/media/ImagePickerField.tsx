'use client'
// components/media/ImagePickerField.tsx
// One reusable "pick an image from the Media Library, or type a URL" field —
// wraps the existing Field (manual URL/alt editing) with a Browse Library
// button and inline preview. Use this everywhere a single image URL is
// edited: cities, city-service-pages, global-service-pages, services,
// location-services — instead of a plain text Field for image_url columns.

import { useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { Field } from '@/components/ui/Field'
import type { ActionResult } from '@/lib/actions'
import { MediaLibraryPickerModal, type PickedMedia } from '@/components/media/MediaLibraryPickerModal'

export function ImagePickerField({
  label,
  value,
  onSave,
  altLabel,
  altValue,
  onSaveAlt,
}: {
  label: string
  value: string
  onSave: (val: string) => Promise<ActionResult>
  altLabel?: string
  altValue?: string
  onSaveAlt?: (val: string) => Promise<ActionResult>
}) {
  const [showPicker, setShowPicker] = useState(false)

  const handlePick = async (item: PickedMedia) => {
    setShowPicker(false)
    await onSave(item.public_url)
    if (onSaveAlt && !String(altValue ?? '').trim()) {
      await onSaveAlt(item.alt_text || item.title || '')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          {/* Keyed by value so a pick from the library (which updates the
              parent's saved value) forces this to show the fresh URL —
              Field only reads its initial value once. */}
          <Field key={value} label={label} value={value} onSave={onSave} />
        </div>
        <button type="button" onClick={() => setShowPicker(true)} className="admin-btn-secondary text-xs shrink-0 mb-0.5">
          <ImageIcon className="w-3.5 h-3.5" /> Browse Library
        </button>
      </div>

      {value && (
        <div className="rounded-lg overflow-hidden border border-[#2a2d3e] bg-[#0f1117] p-2 inline-block">
          <img src={value} alt={altValue || ''} className="max-h-28 object-contain rounded" />
        </div>
      )}

      {altLabel && onSaveAlt && (
        <Field key={altValue} label={altLabel} value={altValue ?? ''} onSave={onSaveAlt} />
      )}

      {showPicker && (
        <MediaLibraryPickerModal onClose={() => setShowPicker(false)} onSelect={handlePick} />
      )}
    </div>
  )
}
