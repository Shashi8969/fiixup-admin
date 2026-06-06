'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'

export function JsonField({ label, value, onSave }: {
  label: string; value: unknown
  onSave: (v: string) => Promise<{ success: boolean; error?: string }>
}) {
  const [text, setText] = useState(JSON.stringify(value ?? [], null, 2))
  const [err,  setErr]  = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    try { JSON.parse(text); setErr('') }
    catch { setErr('Invalid JSON — fix before saving'); return }
    setBusy(true)
    const r = await onSave(text)
    setBusy(false)
    if (!r.success) setErr(r.error ?? 'Error')
  }

  return (
    <div className="space-y-1.5">
      <label className="admin-label">{label}</label>
      <textarea value={text} onChange={e => setText(e.target.value)}
        rows={6} className="admin-textarea font-mono text-xs" spellCheck={false} />
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <button onClick={save} disabled={busy} className="admin-btn-primary">
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Save JSON
      </button>
    </div>
  )
}

// ── Badge helper ──────────────────────────────────────────────────────────────
export function Badge({ children }: { children: ReactNode }) {
  return <span className="ml-1.5 text-xs bg-[#2a2d3e] text-[#94a3b8] px-2 py-0.5 rounded-full font-normal">{children}</span>
}

// ── NearbyAreasPicker — shows city areas as clickable buttons ─────────────────
