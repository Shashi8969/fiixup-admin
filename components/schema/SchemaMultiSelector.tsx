'use client'

import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { Check, Code2, Copy, Loader2, Save, Sparkles } from 'lucide-react'
import { showToast } from '@/components/ui/Toast'
import { buildSchemaGraph } from '@/utils/schema/buildSchemaGraph'
import {
  RECOMMENDED_SCHEMA_TYPES,
  SCHEMA_OPTIONS,
  type SchemaEntityType,
  type SchemaPageKind,
} from '@/utils/schema/schemaTypes'

type SaveResult = { success: boolean; error?: string; message?: string }

export function SchemaMultiSelector({
  kind,
  record,
  urlPath,
  faqs = [],
  blocks = [],
  selectedTypes,
  overrides,
  onSave,
}: {
  kind: SchemaPageKind
  record: Record<string, unknown>
  urlPath: string
  faqs?: Record<string, unknown>[]
  blocks?: Record<string, unknown>[]
  selectedTypes?: SchemaEntityType[]
  overrides?: Record<string, unknown>
  onSave: (payload: { schema_types: SchemaEntityType[]; schema_overrides: Record<string, unknown>; schema_json: Record<string, unknown> }) => Promise<SaveResult>
}) {
  const recommended = RECOMMENDED_SCHEMA_TYPES[kind]
  const [selected, setSelected] = useState<SchemaEntityType[]>(selectedTypes?.length ? selectedTypes : recommended)
  const [localOverrides, setLocalOverrides] = useState<Record<string, unknown>>(overrides ?? {})
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showJson, setShowJson] = useState(true)

  const allowedOptions = useMemo(() => {
    return Object.entries(SCHEMA_OPTIONS).filter(([, option]) => option.bestFor.includes(kind)) as [SchemaEntityType, typeof SCHEMA_OPTIONS[SchemaEntityType]][]
  }, [kind])

  const schemaJson = useMemo(() => buildSchemaGraph({
    kind,
    record,
    selectedTypes: selected,
    urlPath,
    faqs,
    blocks,
    overrides: localOverrides,
  }), [kind, record, selected, urlPath, faqs, blocks, localOverrides])

  const jsonString = JSON.stringify(schemaJson, null, 2)
  const graphCount = Array.isArray(schemaJson['@graph']) ? schemaJson['@graph'].length : 0

  useEffect(() => {
    setSelected(selectedTypes?.length ? selectedTypes : recommended)
  }, [selectedTypes, recommended])

  const toggle = (type: SchemaEntityType) => {
    setSelected(prev => prev.includes(type) ? prev.filter(item => item !== type) : [...prev, type])
  }

  const applyRecommended = () => setSelected(recommended)

  const saveSchema = async () => {
    setSaving(true)
    const result = await onSave({ schema_types: selected, schema_overrides: localOverrides, schema_json: schemaJson })
    setSaving(false)
    if (result.success) showToast('success', result.message ?? 'Schema saved')
    else showToast('error', result.error ?? 'Schema save failed')
  }

  const copy = async () => {
    await navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const setOverride = (key: string, value: string) => {
    setLocalOverrides(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-5">
      <div className="admin-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="admin-section-title flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" /> Schema Builder
            </h2>
            <p className="text-xs text-[#6b7280] mt-1">
              Select one or multiple schema types. JSON-LD updates from your page data, FAQs and content blocks.
            </p>
          </div>
          <button onClick={applyRecommended} className="admin-btn-secondary text-xs">
            Use Recommended
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {allowedOptions.map(([type, option]) => {
            const active = selected.includes(type)
            return (
              <button
                key={type}
                onClick={() => toggle(type)}
                className={clsx(
                  'text-left p-3 rounded-xl border transition-all flex gap-3',
                  active ? 'border-blue-500 bg-blue-500/10' : 'border-[#2a2d3e] bg-[#0f1117] hover:border-[#3a3d4e]'
                )}
              >
                <span className={clsx(
                  'mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                  active ? 'bg-blue-500 border-blue-500' : 'border-[#475569]'
                )}>
                  {active && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#e2e8f0]">{option.label}</span>
                  <span className="block text-xs text-[#6b7280] leading-relaxed mt-1">{option.desc}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="admin-card p-5 space-y-4">
        <h3 className="admin-section-title">Optional Schema Overrides</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SchemaInput label="Schema Name / Headline" value={String(localOverrides.name ?? localOverrides.headline ?? '')} onChange={(v) => { setOverride('name', v); setOverride('headline', v) }} />
          <SchemaInput label="Description Override" value={String(localOverrides.description ?? '')} onChange={(v) => setOverride('description', v)} />
          {kind === 'post' && <SchemaInput label="HowTo Total Time" placeholder="PT30M" value={String(localOverrides.totalTime ?? '')} onChange={(v) => setOverride('totalTime', v)} />}
          {kind === 'post' && <SchemaInput label="Estimated Cost INR" placeholder="499" value={String(localOverrides.estimatedCost ?? '')} onChange={(v) => setOverride('estimatedCost', v)} />}
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#2a2d3e] flex-wrap">
          <button onClick={() => setShowJson(p => !p)} className="flex items-center gap-2 text-sm font-semibold text-[#e2e8f0]">
            <Code2 className="w-4 h-4 text-blue-400" /> JSON-LD Preview
            <span className="text-xs text-[#6b7280] font-normal">{graphCount} schema node{graphCount === 1 ? '' : 's'}</span>
          </button>
          <div className="flex gap-2">
            <button onClick={copy} className="admin-btn-secondary text-xs">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={saveSchema} disabled={saving || selected.length === 0} className="admin-btn-primary text-xs">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Schema
            </button>
          </div>
        </div>

        {selected.length === 0 ? (
          <div className="p-5 text-sm text-amber-400">Select at least one schema type.</div>
        ) : showJson ? (
          <pre className="p-5 text-xs font-mono text-green-400 bg-[#0a0c14] overflow-x-auto leading-relaxed max-h-[520px]">
            {jsonString}
          </pre>
        ) : (
          <div className="p-5 text-xs text-[#6b7280]">
            Preview hidden. Schema will be saved into <code className="text-blue-400">schema_types</code>, <code className="text-blue-400">schema_overrides</code> and <code className="text-blue-400">schema_json</code>.
          </div>
        )}
      </div>
    </div>
  )
}

function SchemaInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="admin-label mb-1 block">{label}</label>
      <input className="admin-input w-full" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || 'Leave blank to auto-fill'} />
    </div>
  )
}
