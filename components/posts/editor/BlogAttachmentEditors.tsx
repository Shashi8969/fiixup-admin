'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'

type SavePatchFn = (patch: Record<string, unknown>) => Promise<{ success: boolean; error?: string; message?: string }>

type LinkAttachment = {
  label: string
  href: string
  description?: string
}

type ServiceAttachment = {
  title: string
  href: string
  description?: string
  price?: string
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return asRecordArray(parsed)
    } catch {
      return []
    }
  }
  return []
}

function toLinkItems(value: unknown, fallbackPrefix = 'Link'): LinkAttachment[] {
  return asRecordArray(value).map((item, index) => ({
    label: String(item.label ?? item.title ?? item.name ?? `${fallbackPrefix} ${index + 1}`),
    href: String(item.href ?? item.url ?? item.path ?? ''),
    description: item.description ? String(item.description) : '',
  }))
}

function toServiceItems(value: unknown): ServiceAttachment[] {
  return asRecordArray(value).map((item, index) => ({
    title: String(item.title ?? item.label ?? item.name ?? `Service ${index + 1}`),
    href: String(item.href ?? item.url ?? item.path ?? ''),
    description: item.description ? String(item.description) : '',
    price: item.price ? String(item.price) : '',
  }))
}

function cleanLinkItems(items: LinkAttachment[]) {
  return items
    .map((item) => ({
      label: item.label.trim(),
      href: item.href.trim(),
      description: item.description?.trim() || undefined,
    }))
    .filter((item) => item.label || item.href)
}

function cleanServiceItems(items: ServiceAttachment[]) {
  return items
    .map((item) => ({
      title: item.title.trim(),
      href: item.href.trim(),
      description: item.description?.trim() || undefined,
      price: item.price?.trim() || undefined,
    }))
    .filter((item) => item.title || item.href)
}

export function PostAttachmentsEditor({ post, savePatch }: {
  post: Record<string, unknown>
  savePatch: SavePatchFn
}) {
  return (
    <div className="admin-card p-6 space-y-6">
      <div>
        <h2 className="admin-section-title">Blog Page Attachments</h2>
        <p className="text-xs text-[#6b7280] mt-1 max-w-2xl">
          Add crawlable internal links that appear below the blog content. Use these for nearby areas, related services and helpful internal links without mixing them into the article body.
        </p>
      </div>

      <AttachmentListEditor
        title="Nearby Areas"
        description="Example: HSR Layout → /bangalore/hsr-layout. These links help users move from blog guides to local area pages."
        emptyLabel="No nearby areas attached yet."
        items={toLinkItems(post.nearby_areas_json, 'Area')}
        columns={[{ key: 'label', label: 'Area name', placeholder: 'HSR Layout' }, { key: 'href', label: 'Link URL', placeholder: '/bangalore/hsr-layout' }, { key: 'description', label: 'Short note', placeholder: 'Doorstep support near HSR Layout' }]}
        onSave={(items) => savePatch({ nearby_areas_json: cleanLinkItems(items as LinkAttachment[]) })}
        newItem={{ label: '', href: '', description: '' }}
      />

      <AttachmentListEditor
        title="Related Services"
        description="Example: Car Battery Replacement → /services/car-battery-replacement-near-me. These render as service cards on the public blog page."
        emptyLabel="No related services attached yet."
        items={toServiceItems(post.related_services_json)}
        columns={[{ key: 'title', label: 'Service title', placeholder: 'Car Battery Replacement' }, { key: 'href', label: 'Link URL', placeholder: '/services/car-battery-replacement-near-me' }, { key: 'description', label: 'Description', placeholder: 'Battery testing and doorstep replacement' }, { key: 'price', label: 'Price/label', placeholder: 'Starts ₹999' }]}
        onSave={(items) => savePatch({ related_services_json: cleanServiceItems(items as ServiceAttachment[]) })}
        newItem={{ title: '', href: '', description: '', price: '' }}
      />

      <AttachmentListEditor
        title="Helpful Internal Links"
        description="Use for manually controlled blog CTAs, guide links, service hub links or booking pages."
        emptyLabel="No internal links attached yet."
        items={toLinkItems(post.internal_links_json, 'Internal link')}
        columns={[{ key: 'label', label: 'Link text', placeholder: 'Doorstep Car Service Guide' }, { key: 'href', label: 'Link URL', placeholder: '/blog/doorstep-car-service-vs-garage' }, { key: 'description', label: 'Short note', placeholder: 'Compare doorstep service with garage visits' }]}
        onSave={(items) => savePatch({ internal_links_json: cleanLinkItems(items as LinkAttachment[]) })}
        newItem={{ label: '', href: '', description: '' }}
      />
    </div>
  )
}

type AttachmentItem = Record<string, string | undefined>

function AttachmentListEditor({
  title,
  description,
  emptyLabel,
  items,
  columns,
  newItem,
  onSave,
}: {
  title: string
  description: string
  emptyLabel: string
  items: AttachmentItem[]
  columns: { key: string; label: string; placeholder: string }[]
  newItem: AttachmentItem
  onSave: (items: AttachmentItem[]) => Promise<{ success: boolean; error?: string; message?: string }>
}) {
  const [draft, setDraft] = useState<AttachmentItem[]>(items)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setDraft(items) }, [JSON.stringify(items)])

  const add = () => setDraft((current) => [...current, newItem])
  const remove = (index: number) => setDraft((current) => current.filter((_, i) => i !== index))
  const update = (index: number, key: string, value: string) => {
    setDraft((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item))
  }
  const saveDraft = async () => {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
  }

  return (
    <div className="rounded-2xl border border-[#2a2d3e] bg-[#11131b] p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#e2e8f0]">{title}</h3>
          <p className="text-xs text-[#6b7280] mt-1">{description}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={add} className="admin-btn-secondary text-xs">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
          <button onClick={saveDraft} disabled={saving} className="admin-btn-primary text-xs">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
          </button>
        </div>
      </div>

      {draft.length === 0 ? (
        <p className="text-sm text-[#6b7280] italic rounded-xl bg-[#0f1117] border border-dashed border-[#2a2d3e] p-4">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {draft.map((item, index) => (
            <div key={index} className="rounded-xl bg-[#0f1117] border border-[#2a2d3e] p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#6b7280]">Item {index + 1}</span>
                <button onClick={() => remove(index)} className="text-[#64748b] hover:text-red-400 transition-colors" aria-label={`Remove ${title} item ${index + 1}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className={clsx('grid gap-3', columns.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3')}>
                {columns.map((column) => (
                  <label key={column.key} className="space-y-1">
                    <span className="text-[11px] font-medium text-[#94a3b8]">{column.label}</span>
                    <input
                      className="admin-input w-full text-sm"
                      value={String(item[column.key] ?? '')}
                      onChange={(event) => update(index, column.key, event.target.value)}
                      placeholder={column.placeholder}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
