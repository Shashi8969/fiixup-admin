'use client'

import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { Check, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Badge } from './JsonAndBadge'
import { Empty, s } from './shared'
import { clsx } from 'clsx'

type Row = Record<string, unknown>

export function NearbyAreasPicker({ lsId, citySlug, existing, onRefresh }: {
  lsId: string; citySlug: string
  existing: Row[]; onRefresh: () => void
}) {
  const sb = getBrowserClient()
  const [cityAreas, setCityAreas] = useState<{id: number; name: string; slug: string}[]>([])
  const [adding,    setAdding]    = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)

  useEffect(() => {
    sb.from('areas').select('id,name,slug').eq('city_slug', citySlug).order('sort_order')
      .then(({ data }) => setCityAreas(data ?? []))
  }, [citySlug])

  const existingSlugs = new Set(existing.map(e => s(e.slug)))

  const addArea = async (area: { id: number; name: string; slug: string }) => {
    setAdding(area.slug)
    const { error } = await sb.from('ls_nearby_areas').insert({
      location_service_id: lsId,
      area_id:    area.id,
      name:       area.name,
      slug:       area.slug,
      sort_order: existing.length,
    })
    setAdding(null)
    if (error) { showToast('error', error.message); return }
    showToast('success', `${area.name} added`)
    onRefresh()
  }

  const removeArea = async (rowId: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return
    setDeleting(rowId)
    await sb.from('ls_nearby_areas').delete().eq('id', rowId)
    setDeleting(null)
    showToast('success', 'Removed')
    onRefresh()
  }

  return (
    <div className="space-y-5">
      <div className="admin-card p-5">
        <h3 className="admin-section-title mb-3">
          City Areas <span className="text-xs text-[#6b7280] font-normal ml-1">— click to add as nearby area</span>
        </h3>
        <p className="text-xs text-[#6b7280] mb-4">
          These appear as internal links on the service page linking to /{citySlug}/[area]
        </p>
        <div className="flex flex-wrap gap-2">
          {cityAreas.map(area => {
            const isAdded = existingSlugs.has(area.slug)
            return (
              <button key={area.slug}
                onClick={() => !isAdded && addArea(area)}
                disabled={isAdded || adding === area.slug}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                  isAdded
                    ? 'bg-green-500/10 border-green-500/30 text-green-400 cursor-default'
                    : 'bg-[#1a1d27] border-[#2a2d3e] text-[#94a3b8] hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5'
                )}>
                {adding === area.slug
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : isAdded
                    ? <Check className="w-3.5 h-3.5" />
                    : <Plus className="w-3.5 h-3.5" />
                }
                {area.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="admin-card p-5">
        <h3 className="admin-section-title mb-3">Added Nearby Areas <Badge>{existing.length}</Badge></h3>
        {existing.length === 0
          ? <p className="text-[#6b7280] text-sm italic">No areas added yet. Click areas above to add them.</p>
          : <div className="space-y-2">
              {existing.map(row => (
                <div key={s(row.id)} className="flex items-center gap-3 bg-[#0f1117] rounded-lg px-4 py-2.5">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-[#e2e8f0]">{s(row.name)}</span>
                    <span className="text-xs text-[#6b7280] ml-2">/{citySlug}/{s(row.slug)}</span>
                  </div>
                  <button onClick={() => removeArea(s(row.id), s(row.name))}
                    disabled={deleting === s(row.id)}
                    className="text-[#475569] hover:text-red-400 transition-colors">
                    {deleting === s(row.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}

// ── ImagePickerTab — browse media library + add images ────────────────────────
