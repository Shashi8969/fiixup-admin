'use client'
// app/(admin)/redirects/page.tsx
// Admin redirect manager for public.redirects table

import { useEffect, useMemo, useState } from 'react'
import { Route } from 'lucide-react'
import { showToast } from '@/components/ui/Toast'
import { RedirectFormModal } from '@/components/redirects/RedirectFormModal'
import { RedirectsTable } from '@/components/redirects/RedirectsTable'
import { RedirectsToolbar } from '@/components/redirects/RedirectsToolbar'
import type { RedirectFormState, RedirectRecord } from '@/components/redirects/types'
import { createRedirect, deleteRedirect, listRedirects, updateRedirect } from '@/lib/actions'

export default function RedirectsPage() {
  const [redirects, setRedirects] = useState<RedirectRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [selected, setSelected] = useState<RedirectRecord | null>(null)

  const load = async () => {
    setLoading(true)
    const result = await listRedirects()
    if (result.success) {
      setRedirects(result.redirects)
    } else {
      showToast('error', result.error)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return redirects
    return redirects.filter(redirect =>
      redirect.source.toLowerCase().includes(q) ||
      redirect.destination.toLowerCase().includes(q) ||
      (redirect.note ?? '').toLowerCase().includes(q)
    )
  }, [redirects, search])

  const openCreate = () => {
    setMode('create')
    setSelected(null)
    setModalOpen(true)
  }

  const openEdit = (redirect: RedirectRecord) => {
    setMode('edit')
    setSelected(redirect)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setSelected(null)
  }

  const submit = async (form: RedirectFormState) => {
    setSaving(true)
    const result = mode === 'edit' && selected
      ? await updateRedirect(selected.id, form)
      : await createRedirect(form)
    setSaving(false)

    if (!result.success) {
      showToast('error', result.error)
      return
    }

    showToast('success', result.message)
    setModalOpen(false)
    setSelected(null)
    await load()
  }

  const remove = async (redirect: RedirectRecord) => {
    if (!confirm(`Delete redirect from "${redirect.source}"?`)) return
    const result = await deleteRedirect(redirect.id, redirect.source)
    if (!result.success) {
      showToast('error', result.error)
      return
    }
    showToast('success', result.message)
    await load()
  }

  const activeCount = redirects.filter(redirect => redirect.is_active ?? true).length
  const permanentCount = redirects.filter(redirect => redirect.is_permanent ?? true).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <Route className="w-6 h-6 text-blue-400" />
            Redirects
          </h1>
          <p className="text-[#94a3b8] text-sm mt-1">
            Manage 301/302 redirects from the Supabase redirects table.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{redirects.length}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Total Redirects</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-green-400">{activeCount}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Active</p>
        </div>
        <div className="admin-card p-4 text-center col-span-2 md:col-span-1">
          <p className="text-2xl font-extrabold text-blue-400">{permanentCount}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Permanent 301</p>
        </div>
      </div>

      <RedirectsToolbar
        search={search}
        onSearch={setSearch}
        onRefresh={load}
        onCreate={openCreate}
        total={filtered.length}
      />

      <RedirectsTable
        redirects={filtered}
        loading={loading}
        onEdit={openEdit}
        onDelete={remove}
      />

      <RedirectFormModal
        open={modalOpen}
        mode={mode}
        redirect={selected}
        saving={saving}
        onClose={closeModal}
        onSubmit={submit}
      />
    </div>
  )
}
