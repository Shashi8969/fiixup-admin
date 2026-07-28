'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { revalidateTeamMembers } from '@/lib/actions'
import { ImageCropUploadModal, type UploadedMediaItem } from '@/components/media/ImageCropUploadModal'
import {
  GripVertical,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  UserCircle2,
  Users,
} from 'lucide-react'

type TeamMemberRow = {
  id: string
  name: string
  role: string | null
  photo_url: string | null
  bio: string | null
  sort_order: number
  is_active: boolean
}

type TeamForm = {
  name: string
  role: string
  photo_url: string
  bio: string
  sort_order: string
  is_active: boolean
}

const EMPTY_FORM: TeamForm = {
  name: '',
  role: '',
  photo_url: '',
  bio: '',
  sort_order: '0',
  is_active: true,
}

function toForm(row: TeamMemberRow): TeamForm {
  return {
    name: row.name,
    role: row.role ?? '',
    photo_url: row.photo_url ?? '',
    bio: row.bio ?? '',
    sort_order: String(row.sort_order),
    is_active: row.is_active,
  }
}

function toPayload(form: TeamForm) {
  return {
    name: form.name.trim(),
    role: form.role.trim() || null,
    photo_url: form.photo_url.trim() || null,
    bio: form.bio.trim() || null,
    sort_order: Number.isFinite(Number(form.sort_order)) ? Number(form.sort_order) : 0,
    is_active: Boolean(form.is_active),
  }
}

export default function TeamPage() {
  const sb = getBrowserClient()
  const [members, setMembers] = useState<TeamMemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newMember, setNewMember] = useState<TeamForm>({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<TeamForm>({ ...EMPTY_FORM })
  const [uploadTarget, setUploadTarget] = useState<'new' | 'edit' | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await sb
      .from('team_members')
      .select('*')
      .order('sort_order', { ascending: true })

    setLoading(false)

    if (error) {
      showToast('error', error.message)
      setMembers([])
      return
    }

    setMembers((data ?? []) as TeamMemberRow[])
  }, [sb])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const filteredMembers = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return members
    return members.filter((m) => [m.name, m.role].filter(Boolean).join(' ').toLowerCase().includes(term))
  }, [members, query])

  const stats = useMemo(() => {
    const total = members.length
    const active = members.filter((m) => m.is_active).length
    return { total, active }
  }, [members])

  const createMember = async () => {
    const payload = toPayload(newMember)

    if (!payload.name) {
      showToast('error', 'Name is required.')
      return
    }

    setSaving(true)
    const { error } = await sb.from('team_members').insert(payload)
    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateTeamMembers()
    showToast('success', revalidate.success ? 'Team member added and live cache cleared.' : 'Team member added. Live site may update within 1 hour.')
    setNewMember({ ...EMPTY_FORM })
    setShowCreate(false)
    fetchMembers()
  }

  const startEdit = (member: TeamMemberRow) => {
    setEditingId(member.id)
    setEditForm(toForm(member))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ ...EMPTY_FORM })
  }

  const saveMember = async (member: TeamMemberRow) => {
    const payload = toPayload(editForm)

    if (!payload.name) {
      showToast('error', 'Name is required.')
      return
    }

    setSaving(true)
    const { error } = await sb.from('team_members').update(payload).eq('id', member.id)
    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateTeamMembers()
    showToast('success', revalidate.success ? 'Team member saved and live cache cleared.' : 'Team member saved. Live site may update within 1 hour.')
    cancelEdit()
    fetchMembers()
  }

  const deleteMember = async (member: TeamMemberRow) => {
    if (!confirm(`Remove "${member.name}" from the team page?`)) return

    const { error } = await sb.from('team_members').delete().eq('id', member.id)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateTeamMembers()
    showToast('success', revalidate.success ? 'Team member removed and live cache cleared.' : 'Team member removed. Live site may update within 1 hour.')
    fetchMembers()
  }

  const handleUploadSuccess = (item: UploadedMediaItem) => {
    if (uploadTarget === 'new') {
      setNewMember((current) => ({ ...current, photo_url: item.public_url }))
    } else if (uploadTarget === 'edit') {
      setEditForm((current) => ({ ...current, photo_url: item.public_url }))
    }
    setUploadTarget(null)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Our Team
          </h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-2xl">
            Manage the real people shown on the public About page&apos;s &quot;Our Team&quot; section. Use only real employees — never placeholder people.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={fetchMembers} className="admin-btn-secondary" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
          <button onClick={() => setShowCreate((open) => !open)} className="admin-btn-primary">
            <Plus className="w-4 h-4" />
            Add Team Member
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.total}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Total Team Members</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.active}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Live on About page</p>
        </div>
      </div>

      {showCreate && (
        <div className="admin-card p-5 space-y-4 border-dashed">
          <div>
            <p className="text-sm font-semibold text-white">Add new team member</p>
            <p className="text-xs text-[#6b7280] mt-0.5">A photo is optional — members without one show an initials avatar instead.</p>
          </div>
          <TeamFormFields form={newMember} setForm={setNewMember} onUploadClick={() => setUploadTarget('new')} />
          <div className="flex gap-2">
            <button onClick={createMember} disabled={saving} className="admin-btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Team Member
            </button>
            <button onClick={() => setShowCreate(false)} className="admin-btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="admin-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or role…"
            className="admin-input pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <Users className="w-8 h-8 text-[#4b5563] mx-auto mb-3" />
          <p className="text-sm text-[#94a3b8]">No team members found.</p>
          <p className="text-xs text-[#6b7280] mt-1">Add your first real team member above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member) => {
            const editing = editingId === member.id
            return (
              <div key={member.id} className="admin-card p-5 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <GripVertical className="hidden w-4 h-4 text-[#374151] md:block flex-shrink-0" />
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2a2d3e] bg-[#0d1117]">
                      {member.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.photo_url} alt={member.name} className="h-full w-full object-cover" />
                      ) : (
                        <UserCircle2 className="h-7 w-7 text-[#475569]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[#e2e8f0]">{member.name}</p>
                        {!member.is_active && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-500/10 text-gray-400 border-gray-500/20 font-semibold">
                            Hidden
                          </span>
                        )}
                      </div>
                      {member.role && <p className="text-sm text-blue-400">{member.role}</p>}
                      {member.bio && <p className="text-xs text-[#6b7280] mt-1 line-clamp-2">{member.bio}</p>}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(member)} className="admin-btn-secondary">Edit</button>
                    <button onClick={() => deleteMember(member)} className="admin-btn-danger">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>

                {editing && (
                  <div className="border-t border-[#2a2d3e] pt-4 space-y-4">
                    <TeamFormFields form={editForm} setForm={setEditForm} onUploadClick={() => setUploadTarget('edit')} />
                    <div className="flex gap-2">
                      <button onClick={() => saveMember(member)} disabled={saving} className="admin-btn-primary">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </button>
                      <button onClick={cancelEdit} className="admin-btn-secondary">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {uploadTarget && (
        <ImageCropUploadModal
          uploadFolder="team"
          onSuccess={handleUploadSuccess}
          onClose={() => setUploadTarget(null)}
        />
      )}
    </div>
  )
}

function TeamFormFields({ form, setForm, onUploadClick }: {
  form: TeamForm
  setForm: React.Dispatch<React.SetStateAction<TeamForm>>
  onUploadClick: () => void
}) {
  const update = (key: keyof TeamForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="md:col-span-2 flex items-center gap-4">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2a2d3e] bg-[#0d1117]">
          {form.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.photo_url} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <UserCircle2 className="h-9 w-9 text-[#475569]" />
          )}
        </div>
        <button type="button" onClick={onUploadClick} className="admin-btn-secondary">
          <Upload className="w-4 h-4" />
          {form.photo_url ? 'Replace Photo' : 'Upload Photo'}
        </button>
      </div>
      <div>
        <label className="admin-label">Full Name *</label>
        <input
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
          className="admin-input"
          placeholder="Real employee name"
        />
      </div>
      <div>
        <label className="admin-label">Role / Title</label>
        <input
          value={form.role}
          onChange={(event) => update('role', event.target.value)}
          className="admin-input"
          placeholder="Founder, Lead Technician…"
        />
      </div>
      <div className="md:col-span-2">
        <label className="admin-label">Short Bio</label>
        <textarea
          value={form.bio}
          onChange={(event) => update('bio', event.target.value)}
          rows={3}
          className="admin-textarea"
          placeholder="1-2 sentences about their role or experience"
        />
      </div>
      <div>
        <label className="admin-label">Sort Order</label>
        <input
          type="number"
          value={form.sort_order}
          onChange={(event) => update('sort_order', event.target.value)}
          className="admin-input"
          placeholder="0"
        />
      </div>
      <label className="flex items-center gap-3 text-sm text-[#cbd5e1] mt-6">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(event) => update('is_active', event.target.checked)}
          className="w-4 h-4 rounded border-[#334155] bg-[#0f1117]"
        />
        Active (visible on live site)
      </label>
    </div>
  )
}
