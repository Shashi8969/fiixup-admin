'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { showToast } from '@/components/ui/Toast'
import { Check, Loader2, Save } from 'lucide-react'
import { s } from './shared'

type Row = Record<string, unknown>

const SCHEMA_TYPES = [
  { id: 'faq',        label: 'FAQPage',        desc: 'Auto-generated from your FAQs tab' },
  { id: 'service',    label: 'Service',         desc: 'Service schema with price and area' },
  { id: 'local',      label: 'LocalBusiness',   desc: 'Local business with address' },
  { id: 'breadcrumb', label: 'BreadcrumbList',  desc: 'Auto-generated breadcrumb trail' },
  { id: 'review',     label: 'AggregateRating', desc: 'Star rating from schema_aggregate_rating' },
  { id: 'custom',     label: 'Custom JSON-LD',  desc: 'Paste any valid schema JSON' },
]

export function SchemaEditor({ ls, onSave, fetchAll, faqs }: {
  ls: Row; onSave: (col: string) => (val: string) => Promise<unknown>
  fetchAll: () => void; faqs: Row[]
}) {
  const [selected, setSelected] = useState<string[]>(['faq','breadcrumb','review'])
  const [customJson, setCustomJson] = useState('')
  const [preview,    setPreview]    = useState('')
  const [generating, setGenerating] = useState(false)

  const generateSchema = () => {
    setGenerating(true)
    const schemas: Record<string,unknown>[] = []
    const city    = s(ls.city_slug)
    const area    = s(ls.area_slug)
    const name    = s(ls.service_name)
    const url     = s(ls.canonical_url).startsWith('http') ? s(ls.canonical_url) : `https://fiixup.in/${city}${area?'/'+area:''}/${s(ls.service_slug)}`
    const phone   = '+918197459732'
    const rating  = Number(ls.schema_aggregate_rating) || 4.9
    const reviews = Number(ls.schema_review_count)     || 150

    if (selected.includes('breadcrumb')) {
      schemas.push({
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type':'ListItem', position:1, name:'Home',      item:'https://fiixup.in' },
          { '@type':'ListItem', position:2, name:city.charAt(0).toUpperCase()+city.slice(1), item:`https://fiixup.in/${city}` },
          ...(area ? [{ '@type':'ListItem', position:3, name:area.replace(/-/g,' '), item:`https://fiixup.in/${city}/${area}` }] : []),
          { '@type':'ListItem', position: area?4:3, name, item: url },
        ]
      })
    }

    if (selected.includes('service')) {
      schemas.push({
        '@type':       'Service',
        name,
        url,
        description:   s(ls.hero_subheading),
        provider: {
          '@type': 'LocalBusiness',
          name:    'Fiixup',
          telephone: phone,
        },
        areaServed: { '@type': 'City', name: city.charAt(0).toUpperCase()+city.slice(1) },
        offers: { '@type': 'Offer', priceSpecification: { '@type': 'PriceSpecification', priceCurrency: 'INR' } },
      })
    }

    if (selected.includes('local')) {
      schemas.push({
        '@type':    'LocalBusiness',
        name:       'Fiixup',
        url:        'https://fiixup.in',
        telephone:  phone,
        areaServed: city.charAt(0).toUpperCase()+city.slice(1),
        priceRange: '₹₹',
      })
    }

    if (selected.includes('review')) {
      schemas.push({
        '@type':           'AggregateRating',
        itemReviewed: { '@type': 'Service', name },
        ratingValue:       rating,
        reviewCount:       reviews,
        bestRating:        5,
        worstRating:       1,
      })
    }

    if (selected.includes('faq') && faqs.length > 0) {
      schemas.push({
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
          '@type':          'Question',
          name:             s(faq.question),
          acceptedAnswer: { '@type': 'Answer', text: s(faq.answer) },
        }))
      })
    }

    if (selected.includes('custom') && customJson) {
      try { schemas.push(JSON.parse(customJson)) } catch { showToast('error', 'Invalid custom JSON') }
    }

    const output = JSON.stringify({ '@context':'https://schema.org', '@graph': schemas }, null, 2)
    setPreview(output)
    setGenerating(false)
    showToast('success', 'Schema generated — review below and save')
  }

  const saveSchema = async () => {
    if (!preview) { showToast('error', 'Generate schema first'); return }
    try {
      const parsed = JSON.parse(preview)
      await onSave('seo_sections')(JSON.stringify(parsed))
    } catch { showToast('error', 'Invalid JSON in preview') }
  }

  return (
    <div className="space-y-5">
      {/* Schema type selector */}
      <div className="admin-card p-5">
        <h3 className="admin-section-title mb-1">Schema Types</h3>
        <p className="text-xs text-[#6b7280] mb-4">Select schema types to include. FAQPage auto-generates from your FAQs tab ({faqs.length} FAQs found).</p>
        <div className="grid grid-cols-2 gap-3">
          {SCHEMA_TYPES.map(type => (
            <button key={type.id}
              onClick={() => setSelected(p => p.includes(type.id) ? p.filter(x=>x!==type.id) : [...p,type.id])}
              className={clsx(
                'flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                selected.includes(type.id)
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-[#2a2d3e] hover:border-[#3a3d4e]'
              )}>
              <div className={clsx('w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors',
                selected.includes(type.id) ? 'border-blue-500 bg-blue-500' : 'border-[#475569]')}>
                {selected.includes(type.id) && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#e2e8f0]">{type.label}</p>
                <p className="text-xs text-[#6b7280] mt-0.5">{type.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {selected.includes('custom') && (
          <div className="mt-4">
            <label className="admin-label">Custom JSON-LD</label>
            <textarea value={customJson} onChange={e => setCustomJson(e.target.value)}
              rows={6} className="admin-textarea font-mono text-xs"
              placeholder='{ "@type": "Thing", ... }' />
          </div>
        )}

        <button onClick={generateSchema} disabled={generating} className="admin-btn-primary mt-4">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Generate Schema
        </button>
      </div>

      {/* Preview + Save */}
      {preview && (
        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="admin-section-title">Generated Schema JSON-LD</h3>
            <button onClick={saveSchema} className="admin-btn-primary">
              <Save className="w-4 h-4" /> Save to Page
            </button>
          </div>
          <pre className="bg-[#0f1117] rounded-xl p-4 text-xs text-[#94a3b8] font-mono overflow-auto max-h-96 leading-relaxed">
            {preview}
          </pre>
        </div>
      )}

      {/* Quick stats */}
      <div className="admin-card p-5">
        <h3 className="admin-section-title mb-3">Schema Signals</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-[#0f1117] rounded-xl p-3">
            <p className="text-xl font-bold text-[#e2e8f0]">{String(ls.schema_aggregate_rating ?? 4.9)}</p>
            <p className="text-xs text-[#6b7280] mt-1">Rating</p>
          </div>
          <div className="bg-[#0f1117] rounded-xl p-3">
            <p className="text-xl font-bold text-[#e2e8f0]">{String(ls.schema_review_count ?? 150)}</p>
            <p className="text-xs text-[#6b7280] mt-1">Reviews</p>
          </div>
          <div className="bg-[#0f1117] rounded-xl p-3">
            <p className="text-xl font-bold text-[#e2e8f0]">{faqs.length}</p>
            <p className="text-xs text-[#6b7280] mt-1">FAQ entries</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Missing imports needed by new components ──────────────────────────────────
// These must be added to the top import block manually if not already there:
// Check, Plus, Trash2, X, Save are already imported above
