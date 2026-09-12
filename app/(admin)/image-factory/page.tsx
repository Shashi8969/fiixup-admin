'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, Bot, CheckCircle2, Image as ImageIcon, Loader2,
  Pause, Play, RefreshCw, Sparkles, WandSparkles,
} from 'lucide-react'
import type { FactoryScanResponse, ImageFactoryTarget } from '@/lib/image-factory/types'

type Failure = { key: string; title: string; error: string }

export default function ImageFactoryPage() {
  const [scan, setScan] = useState<FactoryScanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [failures, setFailures] = useState<Failure[]>([])
  const [current, setCurrent] = useState<ImageFactoryTarget | null>(null)
  const [sectionCount, setSectionCount] = useState(4)
  const stopRef = useRef(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/image-factory/scan?sections=${sectionCount}`, { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Scan failed')
      setScan(json)
    } catch (error) {
      setFailures(prev => [{
        key: 'scan',
        title: 'Page scan',
        error: error instanceof Error ? error.message : 'Scan failed',
      }, ...prev])
    } finally {
      setLoading(false)
    }
  }, [sectionCount])

  useEffect(() => { refresh() }, [refresh])

  const generateOne = async (target: ImageFactoryTarget) => {
    const response = await fetch('/api/image-factory/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target }),
    })
    const json = await response.json()
    if (!response.ok) throw new Error(json.error || 'Generation failed')
    return json
  }

  const run = async (max?: number) => {
    if (!scan?.targets.length || running) return
    stopRef.current = false
    setRunning(true)
    const queue = max ? scan.targets.slice(0, max) : [...scan.targets]

    for (const target of queue) {
      if (stopRef.current) break
      setCurrent(target)
      try {
        await generateOne(target)
        setCompleted(value => value + 1)
        setScan(prev => prev ? {
          ...prev,
          targets: prev.targets.filter(item => item.key !== target.key),
          total: Math.max(0, prev.total - 1),
        } : prev)
      } catch (error) {
        setFailures(prev => [{
          key: target.key,
          title: target.title,
          error: error instanceof Error ? error.message : 'Generation failed',
        }, ...prev].slice(0, 20))
      }
    }

    setCurrent(null)
    setRunning(false)
    await refresh()
  }

  const runAll = async () => {
    const count = scan?.targets.length ?? 0
    if (!count) return
    if (!window.confirm(`Generate and publish ${count} images now? This will use your configured image API billing.`)) return
    await run()
  }

  const stop = () => {
    stopRef.current = true
  }

  const visible = scan?.targets.slice(0, 80) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <WandSparkles className="w-5 h-5 text-blue-400" />
            Fiixup Image Factory
          </h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-3xl">
            Finds missing, default, and reused page images, creates a unique service-specific image,
            applies the official Fiixup brand overlay, uploads WebP to Supabase, and updates the page automatically.
          </p>
        </div>
        <button onClick={refresh} disabled={loading || running} className="admin-btn-secondary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Scan again
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Images waiting" value={scan?.total ?? 0} icon={<ImageIcon className="w-4 h-4" />} />
        <Stat label="Hero / cover" value={scan?.byVariant?.hero ?? 0 + (scan?.byVariant?.cover ?? 0)} icon={<Sparkles className="w-4 h-4" />} />
        <Stat label="Blog section" value={scan?.byVariant?.section ?? 0} icon={<Bot className="w-4 h-4" />} />
        <Stat label="Completed this run" value={completed} icon={<CheckCircle2 className="w-4 h-4" />} />
      </div>

      <div className="admin-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="admin-section-title">Bulk generation</h2>
            <p className="text-xs text-[#6b7280] mt-1">
              Every page gets its own prompt from the service, city, area, category, and blog topic.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-[#94a3b8]">
            Blog topic images
            <select
              className="admin-input w-20 py-1.5"
              value={sectionCount}
              onChange={e => setSectionCount(Number(e.target.value))}
              disabled={running}
            >
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </label>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!running ? (
            <>
              <button onClick={() => run(1)} disabled={!scan?.targets.length} className="admin-btn-secondary">
                <Play className="w-4 h-4" /> Generate next
              </button>
              <button onClick={() => run(10)} disabled={!scan?.targets.length} className="admin-btn-secondary">
                <Sparkles className="w-4 h-4" /> Generate 10
              </button>
              <button onClick={runAll} disabled={!scan?.targets.length} className="admin-btn-primary">
                <WandSparkles className="w-4 h-4" /> Generate all ({scan?.targets.length ?? 0})
              </button>
            </>
          ) : (
            <button onClick={stop} className="admin-btn-secondary">
              <Pause className="w-4 h-4" /> Pause after current image
            </button>
          )}
        </div>

        {running && current && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-[#e2e8f0] font-semibold truncate">{current.title}</p>
              <p className="text-xs text-[#6b7280] truncate">{current.table} · {current.variant} · {current.slug}</p>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-[#0f1117] border border-[#2a2d3e] p-4 text-xs text-[#94a3b8] space-y-1">
          <p><strong className="text-[#e2e8f0]">Required server env:</strong> OPENAI_API_KEY</p>
          <p><strong className="text-[#e2e8f0]">Recommended for continuous cron:</strong> SUPABASE_SERVICE_ROLE_KEY + IMAGE_FACTORY_CRON_SECRET</p>
          <p><strong className="text-[#e2e8f0]">Optional:</strong> FIIXUP_LOGO_URL, OPENAI_IMAGE_MODEL, OPENAI_IMAGE_QUALITY, FIIXUP_IMAGE_PHONE=false</p>
        </div>
      </div>

      {failures.length > 0 && (
        <div className="admin-card p-5">
          <h2 className="admin-section-title flex items-center gap-2 text-red-300">
            <AlertTriangle className="w-4 h-4" /> Recent failures
          </h2>
          <div className="mt-3 space-y-2">
            {failures.map((failure, i) => (
              <div key={`${failure.key}-${i}`} className="text-xs rounded-lg bg-red-500/5 border border-red-500/15 p-3">
                <p className="text-red-300 font-semibold">{failure.title}</p>
                <p className="text-[#94a3b8] mt-1 break-words">{failure.error}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2a2d3e] flex items-center justify-between">
          <div>
            <h2 className="admin-section-title">Generation queue</h2>
            <p className="text-xs text-[#6b7280] mt-1">Showing first {visible.length} pending items.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-[#6b7280] bg-[#111827]">
              <tr>
                <th className="text-left px-4 py-3">Page</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">Current</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(target => (
                <tr key={target.key} className="border-t border-[#1e2535]">
                  <td className="px-4 py-3 min-w-[320px]">
                    <p className="text-[#e2e8f0] font-medium">{target.sectionHeading || target.title}</p>
                    <p className="text-xs text-[#6b7280] mt-0.5">{target.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8]">{target.table} · {target.variant}</td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8]">{[target.area, target.city].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3">
                    {target.currentImage ? (
                      <img src={target.currentImage} alt="Current" className="w-20 h-12 rounded object-cover border border-[#2a2d3e]" />
                    ) : <span className="text-xs text-amber-400">Missing / topic image</span>}
                  </td>
                </tr>
              ))}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-[#6b7280]">No image work pending.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="admin-card p-4">
      <div className="flex items-center gap-2 text-[#6b7280] text-xs">{icon}{label}</div>
      <p className="text-2xl font-bold text-[#e2e8f0] mt-2">{value}</p>
    </div>
  )
}
