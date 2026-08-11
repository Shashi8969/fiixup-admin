'use client'

import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { AlertTriangle, Check, ChevronDown, ChevronRight, Code2, Copy, Loader2, Save, Sparkles } from 'lucide-react'
import { showToast } from '@/components/ui/Toast'
import { buildSchemaGraph } from '@/utils/schema/buildSchemaGraph'
import { overrideFieldsFor, validateSchemaGraph } from '@/utils/schema/schemaFieldRegistry'
import {
  RECOMMENDED_SCHEMA_TYPES,
  SCHEMA_OPTIONS,
  type SchemaEntityType,
  type SchemaPageKind,
} from '@/utils/schema/schemaTypes'

// Kinds where schema_json is the sole, directly-served value with no
// Postgres trigger recomputing it — pasting a full custom JSON-LD block is
// safe and effective here. For every other kind, a DB trigger rebuilds the
// core schema fresh on every save (and merges the override fields above
// into it) — a pasted full block there would either be ignored or, worse,
// freeze the page's schema until manually cleared. See schema_overrides
// merge in fn_build_ls_seo_page / fn_build_csp_seo_page / trg_fn_gsp_schema.
const RAW_JSON_SAFE_KINDS: SchemaPageKind[] = ['post']

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
  const rawJsonSafe = RAW_JSON_SAFE_KINDS.includes(kind)
  const [useRawJson, setUseRawJson] = useState(false)
  const [rawJsonText, setRawJsonText] = useState('')
  const [rawJsonError, setRawJsonError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const allowedOptions = useMemo(() => {
    return Object.entries(SCHEMA_OPTIONS).filter(([, option]) => option.bestFor.includes(kind)) as [SchemaEntityType, typeof SCHEMA_OPTIONS[SchemaEntityType]][]
  }, [kind])

  const overrideFields = useMemo(() => overrideFieldsFor(selected), [selected])

  const schemaJson = useMemo(() => buildSchemaGraph({
    kind,
    record,
    selectedTypes: selected,
    urlPath,
    faqs,
    blocks,
    overrides: localOverrides,
  }), [kind, record, selected, urlPath, faqs, blocks, localOverrides])

  const warnings = useMemo(
    () => validateSchemaGraph(Array.isArray(schemaJson['@graph']) ? schemaJson['@graph'] as Record<string, unknown>[] : []),
    [schemaJson]
  )

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
    let payloadSchemaJson: Record<string, unknown> = schemaJson
    if (useRawJson) {
      try {
        payloadSchemaJson = JSON.parse(rawJsonText)
        setRawJsonError('')
      } catch {
        setRawJsonError('Invalid JSON — fix before saving')
        return
      }
    }
    setSaving(true)
    const result = await onSave({ schema_types: selected, schema_overrides: localOverrides, schema_json: payloadSchemaJson })
    setSaving(false)
    if (result.success) showToast('success', result.message ?? 'Schema saved')
    else showToast('error', result.error ?? 'Schema save failed')
  }

  const copy = async () => {
    await navigator.clipboard.writeText(useRawJson ? rawJsonText : jsonString)
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
        <div>
          <h3 className="admin-section-title">Schema Field Overrides</h3>
          <p className="text-xs text-[#6b7280] mt-1">
            Every field is optional — leave blank to keep the auto-filled value shown as its placeholder. Fields only appear for the schema types selected above.
          </p>
        </div>
        {overrideFields.length === 0 ? (
          <p className="text-xs text-[#6b7280] italic">Select a schema type above to see its overridable fields.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overrideFields.map((field) => (
              <SchemaInput
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                value={String(localOverrides[field.key] ?? '')}
                onChange={(v) => setOverride(field.key, v)}
              />
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <ul className="space-y-0.5">
              {warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className="admin-card p-5">
        <button onClick={() => setShowAdvanced(p => !p)} className="flex items-center gap-2 text-sm font-semibold text-[#e2e8f0] w-full">
          {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Advanced: Custom JSON-LD
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-3">
            {rawJsonSafe ? (
              <>
                <label className="flex items-center gap-2 text-xs text-[#9ca3af] cursor-pointer">
                  <input type="checkbox" checked={useRawJson} onChange={(e) => { setUseRawJson(e.target.checked); if (e.target.checked && !rawJsonText) setRawJsonText(jsonString) }} />
                  Use a fully custom JSON-LD block instead of the generated schema above
                </label>
                {useRawJson && (
                  <>
                    <textarea
                      value={rawJsonText}
                      onChange={(e) => setRawJsonText(e.target.value)}
                      rows={12}
                      className="admin-textarea w-full font-mono text-xs"
                      spellCheck={false}
                    />
                    {rawJsonError && <p className="text-red-400 text-xs">{rawJsonError}</p>}
                  </>
                )}
              </>
            ) : (
              <p className="text-xs text-[#6b7280] leading-relaxed">
                Custom JSON-LD isn&apos;t available for this page type — its core schema (LocalBusiness/Service/FAQPage)
                is generated fresh from your live content on every save. Use the override fields above for specific
                values instead; a full custom block here would go stale the next time you edit this page&apos;s content.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#2a2d3e] flex-wrap">
          <button onClick={() => setShowJson(p => !p)} className="flex items-center gap-2 text-sm font-semibold text-[#e2e8f0]">
            <Code2 className="w-4 h-4 text-blue-400" /> JSON-LD Preview
            <span className="text-xs text-[#6b7280] font-normal">
              {useRawJson ? 'custom JSON-LD' : `${graphCount} schema node${graphCount === 1 ? '' : 's'}`}
            </span>
          </button>
          <div className="flex gap-2">
            <button onClick={copy} className="admin-btn-secondary text-xs">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={saveSchema} disabled={saving || (selected.length === 0 && !useRawJson)} className="admin-btn-primary text-xs">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Schema
            </button>
          </div>
        </div>

        {useRawJson ? (
          <pre className="p-5 text-xs font-mono text-green-400 bg-[#0a0c14] overflow-x-auto leading-relaxed max-h-[520px] whitespace-pre-wrap">
            {rawJsonText}
          </pre>
        ) : selected.length === 0 ? (
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
