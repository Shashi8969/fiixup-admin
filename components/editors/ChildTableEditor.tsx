'use client'
// components/editors/ChildTableEditor.tsx
// Generic CRUD editor for any child table row
// Used for: pricing rows, FAQs, testimonials, nearby areas, related services

import { useState } from 'react'
import { Plus, Trash2, Save, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { showToast } from '@/components/ui/Toast'
import type { ActionResult } from '@/lib/actions'

// ─── Field definition ─────────────────────────────────────────────────────────
export interface FieldDef {
  key:         string
  label:       string
  type:        'text' | 'textarea' | 'number' | 'boolean'
  placeholder?: string
  rows?:       number
  required?:   boolean
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ChildTableEditorProps<T extends Record<string, unknown>> {
  title:    string
  items:    T[]
  fields:   FieldDef[]
  idKey:    string       // usually 'id'
  onSave:   (id: string, data: Partial<T>) => Promise<ActionResult>
  onAdd:    (data: Partial<T>)            => Promise<ActionResult>
  onDelete: (id: string)                  => Promise<ActionResult>
  addLabel?: string
  emptyText?: string
  highlight?: boolean   // show highlight checkbox (for pricing rows)
}

export function ChildTableEditor<T extends Record<string, unknown>>({
  title, items, fields, idKey,
  onSave, onAdd, onDelete,
  addLabel = 'Add Row',
  emptyText = 'No items yet.',
}: ChildTableEditorProps<T>) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving,   setSaving]   = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [adding,   setAdding]   = useState(false)
  const [newItem,  setNewItem]  = useState<Record<string, unknown>>({})
  const [edits,    setEdits]    = useState<Record<string, Record<string, unknown>>>({})

  const getEdit = (id: string, key: string, fallback: unknown) =>
    edits[id]?.[key] ?? fallback

  const setEdit = (id: string, key: string, val: unknown) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: val },
    }))
  }

  const handleSave = async (item: T) => {
    const id     = String(item[idKey])
    const changes = edits[id] ?? {}
    if (!Object.keys(changes).length) { setExpanded(null); return }

    setSaving(id)
    const result = await onSave(id, changes as Partial<T>)
    setSaving(null)

    if (result.success) {
      showToast('success', result.message)
      setEdits((prev) => { const n = { ...prev }; delete n[id]; return n })
      setExpanded(null)
    } else {
      showToast('error', result.error)
    }
  }

  const handleDelete = async (item: T) => {
    if (!confirm('Delete this item? This cannot be undone.')) return
    const id = String(item[idKey])
    setDeleting(id)
    const result = await onDelete(id)
    setDeleting(null)
    if (result.success) showToast('success', result.message)
    else showToast('error', result.error)
  }

  const handleAdd = async () => {
    setAdding(true)
    const result = await onAdd(newItem as Partial<T>)
    setAdding(false)
    if (result.success) {
      showToast('success', result.message)
      setNewItem({})
    } else {
      showToast('error', result.error)
    }
  }

  const renderField = (
    key: string,
    field: FieldDef,
    value: unknown,
    onChange: (val: unknown) => void
  ) => {
    if (field.type === 'boolean') {
      return (
        <label key={key} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 accent-blue-500"
          />
          <span className="text-sm text-[#e2e8f0]">{field.label}</span>
        </label>
      )
    }
    if (field.type === 'textarea') {
      return (
        <div key={key}>
          <label className="admin-label">{field.label}</label>
          <textarea
            value={String(value ?? '')}
            rows={field.rows ?? 3}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="admin-textarea"
          />
        </div>
      )
    }
    return (
      <div key={key}>
        <label className="admin-label">{field.label}</label>
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
          className="admin-input"
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="admin-section-title">{title}</h3>
        <span className="text-xs text-[#6b7280] bg-[#2a2d3e] px-2.5 py-1 rounded-full">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Items */}
      {items.length === 0 && (
        <p className="text-[#6b7280] text-sm italic py-2">{emptyText}</p>
      )}

      {items.map((item) => {
        const id        = String(item[idKey])
        const isOpen    = expanded === id
        const isSaving  = saving  === id
        const isDeleting = deleting === id
        const hasEdits  = Object.keys(edits[id] ?? {}).length > 0

        // Primary display field (first non-boolean field)
        const primaryField = fields.find((f) => f.type !== 'boolean')
        const primaryVal   = primaryField
          ? String(getEdit(id, primaryField.key, item[primaryField.key]) ?? '')
          : id

        return (
          <div key={id} className="admin-card overflow-hidden">
            {/* Row header */}
            <button
              onClick={() => setExpanded(isOpen ? null : id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#232637] transition-colors"
            >
              <span className="flex-1 text-sm font-medium text-[#e2e8f0] truncate">
                {primaryVal || `Item ${id.slice(0, 8)}`}
              </span>
              {hasEdits && (
                <span className="text-xs text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-0.5 rounded-full">
                  Unsaved
                </span>
              )}
              {isDeleting
                ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                : <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item) }}
                    className="text-[#4b5563] hover:text-red-400 transition-colors p-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
              }
              {isOpen
                ? <ChevronUp   className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
                : <ChevronDown className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
              }
            </button>

            {/* Expanded form */}
            {isOpen && (
              <div className="px-4 pb-4 border-t border-[#2a2d3e] space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map((f) =>
                    renderField(
                      f.key,
                      f,
                      getEdit(id, f.key, item[f.key]),
                      (val) => setEdit(id, f.key, val)
                    )
                  )}
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => { setEdits((p) => { const n = {...p}; delete n[id]; return n }); setExpanded(null) }}
                    className="admin-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave(item)}
                    disabled={isSaving || !hasEdits}
                    className="admin-btn-primary"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Add new item */}
      <div className="admin-card p-4 border-dashed">
        <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
          + {addLabel}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          {fields.map((f) =>
            renderField(
              `new-${f.key}`,
              f,
              newItem[f.key] ?? '',
              (val) => setNewItem((prev) => ({ ...prev, [f.key]: val }))
            )
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={adding}
          className="admin-btn-primary"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {addLabel}
        </button>
      </div>
    </div>
  )
}
