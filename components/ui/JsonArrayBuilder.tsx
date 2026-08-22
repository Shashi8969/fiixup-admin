'use client'
// components/ui/JsonArrayBuilder.tsx
//
// Drop-in replacement for the JsonField/JsonField-with-hint components
// scattered across the admin (LocationServiceEditorParts, CityEditorParts,
// CityServicePageEditorParts — three near-identical copies of "type raw
// JSON into a textarea"). Same {label, value, onSave} contract, so any
// existing call site can swap the component name and keep working —
// but instead of hand-written JSON, this renders real add/edit/remove
// controls per item, plus a "paste text, auto-fill the fields" box for
// pasting AI-generated content directly instead of retyping it as JSON.
//
// Two modes, chosen by whether `fields` is passed:
//   - Object-array: fields=[{key,label,type}] — e.g. [{heading,text}]
//   - String-array: omit fields — plain string[], e.g. hero_bullets

import { useMemo, useState } from 'react'
import { Code2, Loader2, Plus, Save, Sparkles, Trash2, Wand2 } from 'lucide-react'

export type JsonArrayFieldDef = { key: string; label: string; type?: 'text' | 'textarea' }

type ObjectItem = Record<string, string>

function parseHeadingBody(firstLine: string): { heading: string; bodyLead: string } {
  // **Heading** — body   /   **Heading**: body
  const bold = firstLine.match(/^\*\*(.+?)\*\*\s*[:\-—]?\s*(.*)$/)
  if (bold) return { heading: bold[1].trim(), bodyLead: bold[2]?.trim() ?? '' }

  // Heading: body   (only treat as a split if the colon shows up early —
  // otherwise it's probably just a sentence with a colon in it)
  const colonIdx = firstLine.indexOf(':')
  if (colonIdx > 0 && colonIdx < 80) {
    return {
      heading: firstLine.slice(0, colonIdx).replace(/\*\*/g, '').trim(),
      bodyLead: firstLine.slice(colonIdx + 1).trim(),
    }
  }

  return { heading: firstLine.replace(/\*\*/g, '').trim(), bodyLead: '' }
}

function stripListMarker(line: string): string {
  return line.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').replace(/^#{1,6}\s+/, '')
}

function splitIntoBlocks(text: string): string[] {
  let blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  if (blocks.length > 1) return blocks
  // Fall back to splitting on list-item boundaries when there's no blank-line
  // separation (a single dense numbered/bulleted list, one item per line).
  blocks = text.split(/\n(?=\s*(?:[-*•]|\d+[.)])\s)/).map((b) => b.trim()).filter(Boolean)
  return blocks.length > 1 ? blocks : text.split('\n').map((b) => b.trim()).filter(Boolean)
}

function parseObjectItems(text: string, fields: JsonArrayFieldDef[]): ObjectItem[] {
  const headingField =
    fields.find((f) => /title|heading|step|name|label/i.test(f.key + f.label)) ?? fields[0]
  const bodyField =
    fields.find((f) => f !== headingField && /text|desc|body/i.test(f.key + f.label)) ??
    fields[fields.length - 1]
  const otherFields = fields.filter((f) => f !== headingField && f !== bodyField)

  return splitIntoBlocks(text)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
      if (lines.length === 0) return null
      const first = stripListMarker(lines[0])
      const { heading, bodyLead } = parseHeadingBody(first)
      const restLines = lines.slice(1).map(stripListMarker)
      const body = [bodyLead, ...restLines].filter(Boolean).join(' ').replace(/\*\*/g, '').trim()

      const item: ObjectItem = {}
      item[headingField.key] = heading
      if (bodyField && bodyField !== headingField) item[bodyField.key] = body
      otherFields.forEach((f) => { item[f.key] = '' })
      return item
    })
    .filter((item): item is ObjectItem => !!item && Boolean(item[headingField.key]))
}

function parseStringItems(text: string): string[] {
  return splitIntoBlocks(text)
    .map((block) => stripListMarker(block.split('\n')[0].trim()).replace(/\*\*/g, '').trim())
    .filter(Boolean)
}

export function JsonArrayBuilder({
  label,
  hint,
  value,
  onSave,
  fields,
  itemNoun = 'item',
}: {
  label: string
  hint?: string
  value: unknown
  onSave: (v: string) => Promise<{ success: boolean; error?: string }>
  fields?: JsonArrayFieldDef[]
  itemNoun?: string
}) {
  const isObjectMode = Boolean(fields && fields.length > 0)

  const initialItems = useMemo<(ObjectItem | string)[]>(() => {
    if (Array.isArray(value)) return value as (ObjectItem | string)[]
    return []
  }, [value])

  const [items, setItems] = useState<(ObjectItem | string)[]>(initialItems)
  const [paste, setPaste] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [rawText, setRawText] = useState(JSON.stringify(initialItems, null, 2))
  const [rawErr, setRawErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const markDirty = (next: (ObjectItem | string)[]) => {
    setItems(next)
    setDirty(true)
  }

  const addBlank = () => {
    const blank: ObjectItem | string = isObjectMode
      ? Object.fromEntries((fields ?? []).map((f) => [f.key, '']))
      : ''
    markDirty([...items, blank])
  }

  const removeAt = (index: number) => {
    markDirty(items.filter((_, i) => i !== index))
  }

  const updateObjectField = (index: number, key: string, val: string) => {
    markDirty(items.map((item, i) => (i === index ? { ...(item as ObjectItem), [key]: val } : item)))
  }

  const updateStringItem = (index: number, val: string) => {
    markDirty(items.map((item, i) => (i === index ? val : item)))
  }

  const parseAndAppend = () => {
    if (!paste.trim()) return
    const parsed = isObjectMode ? parseObjectItems(paste, fields ?? []) : parseStringItems(paste)
    if (parsed.length === 0) {
      return
    }
    markDirty([...items, ...(parsed as (ObjectItem | string)[])])
    setPaste('')
    setShowPaste(false)
  }

  const save = async () => {
    setSaving(true)
    const text = JSON.stringify(items)
    const r = await onSave(text)
    setSaving(false)
    if (r.success) {
      setDirty(false)
      setRawText(JSON.stringify(items, null, 2))
    }
  }

  const saveRaw = async () => {
    try {
      const parsed = JSON.parse(rawText)
      setRawErr('')
      setSaving(true)
      const r = await onSave(JSON.stringify(parsed))
      setSaving(false)
      if (r.success) {
        setItems(Array.isArray(parsed) ? parsed : [])
        setDirty(false)
      } else {
        setRawErr(r.error ?? 'Error')
      }
    } catch {
      setRawErr('Invalid JSON — fix before saving')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="admin-label mb-0">{label}</label>
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs text-[#6b7280] hover:text-[#94a3b8] flex items-center gap-1"
        >
          <Code2 className="w-3 h-3" /> {showRaw ? 'Hide raw JSON' : 'Edit raw JSON instead'}
        </button>
      </div>
      {hint && <p className="text-xs text-[#475569] font-mono -mt-2">Format: {hint}</p>}

      {showRaw ? (
        <div className="space-y-1.5">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={7}
            className="admin-textarea font-mono text-xs"
            spellCheck={false}
          />
          {rawErr && <p className="text-red-400 text-xs">{rawErr}</p>}
          <button onClick={saveRaw} disabled={saving} className="admin-btn-primary">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save JSON
          </button>
        </div>
      ) : (
        <>
          {items.length === 0 && (
            <p className="text-sm text-[#6b7280] italic py-1">No {itemNoun}s yet — add one below or paste text to auto-fill.</p>
          )}

          <div className="space-y-2">
            {items.map((item, index) =>
              isObjectMode ? (
                <div key={index} className="rounded-xl border border-[#2a2d3e] bg-[#11131c] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                      {itemNoun} {index + 1}
                    </span>
                    <button onClick={() => removeAt(index)} className="admin-btn-danger !px-2 !py-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {(fields ?? []).map((f) =>
                    f.type === 'textarea' ? (
                      <textarea
                        key={f.key}
                        value={(item as ObjectItem)[f.key] ?? ''}
                        onChange={(e) => updateObjectField(index, f.key, e.target.value)}
                        placeholder={f.label}
                        rows={2}
                        className="admin-textarea text-sm"
                      />
                    ) : (
                      <input
                        key={f.key}
                        value={(item as ObjectItem)[f.key] ?? ''}
                        onChange={(e) => updateObjectField(index, f.key, e.target.value)}
                        placeholder={f.label}
                        className="admin-input text-sm"
                      />
                    ),
                  )}
                </div>
              ) : (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={item as string}
                    onChange={(e) => updateStringItem(index, e.target.value)}
                    className="admin-input text-sm flex-1"
                  />
                  <button onClick={() => removeAt(index)} className="admin-btn-danger !px-2 !py-2 flex-shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ),
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={addBlank} className="admin-btn-secondary">
              <Plus className="w-3.5 h-3.5" /> Add {itemNoun}
            </button>
            <button onClick={() => setShowPaste((v) => !v)} className="admin-btn-secondary">
              <Sparkles className="w-3.5 h-3.5" /> Paste Text to Auto-Fill
            </button>
            <button onClick={save} disabled={saving || !dirty} className="admin-btn-primary">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>

          {showPaste && (
            <div className="rounded-xl border border-dashed border-[#3a3d4e] p-3 space-y-2">
              <p className="text-xs text-[#6b7280]">
                Paste text from ChatGPT/Claude/etc — one {itemNoun} per paragraph or list item works best,
                e.g. <span className="font-mono text-[#94a3b8]">**Heading** — description</span> or{' '}
                <span className="font-mono text-[#94a3b8]">1. Heading: description</span>. Adds to the list
                above without saving — review and edit before you hit Save.
              </p>
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                rows={6}
                className="admin-textarea text-sm"
                placeholder="Paste generated text here…"
              />
              <div className="flex gap-2">
                <button onClick={parseAndAppend} className="admin-btn-primary">
                  <Wand2 className="w-3.5 h-3.5" /> Parse &amp; Add
                </button>
                <button onClick={() => { setShowPaste(false); setPaste('') }} className="admin-btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
