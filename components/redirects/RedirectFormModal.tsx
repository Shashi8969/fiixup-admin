'use client'

import { useEffect, useState } from 'react'
import { Loader2, Route, X } from 'lucide-react'
import { EMPTY_REDIRECT_FORM, type RedirectFormState, type RedirectRecord, redirectToForm } from './types'

interface RedirectFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  redirect: RedirectRecord | null
  saving: boolean
  onClose: () => void
  onSubmit: (form: RedirectFormState) => Promise<void>
}

export function RedirectFormModal({ open, mode, redirect, saving, onClose, onSubmit }: RedirectFormModalProps) {
  const [form, setForm] = useState<RedirectFormState>(EMPTY_REDIRECT_FORM)

  useEffect(() => {
    if (!open) return
    setForm(mode === 'edit' && redirect ? redirectToForm(redirect) : EMPTY_REDIRECT_FORM)
  }, [open, mode, redirect])

  if (!open) return null

  const update = <K extends keyof RedirectFormState>(key: K, value: RedirectFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="admin-card w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3e]">
          <div>
            <h2 className="admin-section-title flex items-center gap-2">
              <Route className="w-4 h-4 text-blue-400" />
              {mode === 'create' ? 'Add Redirect' : 'Edit Redirect'}
            </h2>
            <p className="text-xs text-[#6b7280] mt-0.5">Manage 301/302 redirects from Supabase.</p>
          </div>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-white" disabled={saving}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Source URL</label>
              <input
                value={form.source}
                onChange={e => update('source', e.target.value)}
                placeholder="/old-page-url"
                className="admin-input"
                required
              />
              <p className="text-[11px] text-[#6b7280] mt-1">Old URL path that should redirect.</p>
            </div>

            <div>
              <label className="admin-label">Destination URL</label>
              <input
                value={form.destination}
                onChange={e => update('destination', e.target.value)}
                placeholder="/new-page-url"
                className="admin-input"
                required
              />
              <p className="text-[11px] text-[#6b7280] mt-1">New internal path or full external URL.</p>
            </div>
          </div>

          <div>
            <label className="admin-label">Note</label>
            <textarea
              value={form.note}
              onChange={e => update('note', e.target.value)}
              placeholder="Why this redirect was added…"
              rows={3}
              className="admin-textarea"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-[#2a2d3e] bg-[#0f1117] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#e2e8f0]">Permanent Redirect</p>
                <p className="text-xs text-[#6b7280] mt-0.5">On = 301, Off = 302</p>
              </div>
              <input
                type="checkbox"
                checked={form.is_permanent}
                onChange={e => update('is_permanent', e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-[#2a2d3e] bg-[#0f1117] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#e2e8f0]">Active</p>
                <p className="text-xs text-[#6b7280] mt-0.5">Turn off without deleting.</p>
              </div>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => update('is_active', e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="admin-btn-secondary" disabled={saving}>Cancel</button>
            <button type="submit" className="admin-btn-primary" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'create' ? 'Create Redirect' : 'Save Redirect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
