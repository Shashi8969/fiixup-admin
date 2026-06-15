'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import {
  AlertCircle,
  CalendarClock,
  CheckCircle,
  Clipboard,
  Download,
  ExternalLink,
  Inbox,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
} from 'lucide-react'
import { clsx } from 'clsx'

type LeadRow = Record<string, unknown>

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost' | 'spam'
type LeadPriority = 'low' | 'normal' | 'high' | 'urgent'

type LeadEditForm = {
  status: LeadStatus
  priority: LeadPriority
  notes: string
  assigned_to: string
  follow_up_at: string
}

const STATUS_OPTIONS: { value: LeadStatus; label: string; helper: string }[] = [
  { value: 'new', label: 'New', helper: 'Fresh enquiry' },
  { value: 'contacted', label: 'Contacted', helper: 'Team called / messaged' },
  { value: 'qualified', label: 'Qualified', helper: 'Valid service lead' },
  { value: 'converted', label: 'Converted', helper: 'Booked / completed' },
  { value: 'lost', label: 'Lost', helper: 'Not converted' },
  { value: 'spam', label: 'Spam', helper: 'Invalid request' },
]

const PRIORITY_OPTIONS: { value: LeadPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

function s(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  return String(value)
}

function getLeadName(lead: LeadRow) {
  return s(lead.name || lead.customer_name || lead.full_name, 'Unknown customer')
}

function getLeadPhone(lead: LeadRow) {
  return s(lead.phone || lead.mobile || lead.mobile_number)
}

function getLeadCity(lead: LeadRow) {
  return s(lead.city || lead.city_name || lead.location)
}

function getLeadVehicle(lead: LeadRow) {
  return s(lead.vehicle_type || lead.vehicle || lead.vehicle_model)
}

function getLeadService(lead: LeadRow) {
  return s(lead.service || lead.service_name || lead.form_type, 'Service enquiry')
}

function getLeadStatus(lead: LeadRow): LeadStatus {
  const value = s(lead.status, 'new')
  return STATUS_OPTIONS.some((item) => item.value === value) ? (value as LeadStatus) : 'new'
}

function getLeadPriority(lead: LeadRow): LeadPriority {
  const value = s(lead.priority, 'normal')
  return PRIORITY_OPTIONS.some((item) => item.value === value) ? (value as LeadPriority) : 'normal'
}

function toInputDateTime(value: unknown) {
  const raw = s(value)
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function toDisplayDate(value: unknown) {
  const raw = s(value)
  if (!raw) return 'Not set'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateOnly(value: unknown) {
  const raw = s(value)
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function statusClass(status: LeadStatus) {
  switch (status) {
    case 'new': return 'bg-blue-500/10 text-blue-300 border-blue-500/20'
    case 'contacted': return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
    case 'qualified': return 'bg-purple-500/10 text-purple-300 border-purple-500/20'
    case 'converted': return 'bg-green-500/10 text-green-300 border-green-500/20'
    case 'lost': return 'bg-slate-500/10 text-slate-300 border-slate-500/20'
    case 'spam': return 'bg-red-500/10 text-red-300 border-red-500/20'
  }
}

function priorityClass(priority: LeadPriority) {
  switch (priority) {
    case 'urgent': return 'bg-red-500/10 text-red-300 border-red-500/20'
    case 'high': return 'bg-orange-500/10 text-orange-300 border-orange-500/20'
    case 'normal': return 'bg-blue-500/10 text-blue-300 border-blue-500/20'
    case 'low': return 'bg-slate-500/10 text-slate-300 border-slate-500/20'
  }
}

function phoneToTel(phone: string) {
  return phone.replace(/[^+\d]/g, '')
}

function phoneToWhatsapp(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  return digits
}

function makeEditForm(lead: LeadRow | null): LeadEditForm {
  return {
    status: lead ? getLeadStatus(lead) : 'new',
    priority: lead ? getLeadPriority(lead) : 'normal',
    notes: s(lead?.notes),
    assigned_to: s(lead?.assigned_to),
    follow_up_at: toInputDateTime(lead?.follow_up_at),
  }
}

function csvEscape(value: unknown) {
  const text = s(value).replace(/\r?\n/g, ' ')
  if (/[",]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function buildLeadSummary(lead: LeadRow) {
  return [
    `Name: ${getLeadName(lead)}`,
    `Phone: ${getLeadPhone(lead) || 'Not provided'}`,
    `Email: ${s(lead.email) || 'Not provided'}`,
    `City: ${getLeadCity(lead) || 'Not provided'}`,
    `Service: ${getLeadService(lead)}`,
    `Vehicle: ${getLeadVehicle(lead) || 'Not provided'}`,
    `Message: ${s(lead.message) || 'No message'}`,
    `Page: ${s(lead.page_url) || 'Not captured'}`,
  ].join('\n')
}

export default function LeadsPage() {
  const sb = getBrowserClient()
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<LeadPriority | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<LeadEditForm>(makeEditForm(null))
  const [tableMissing, setTableMissing] = useState(false)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setTableMissing(false)
    const { data, error } = await sb
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    setLoading(false)

    if (error) {
      setLeads([])
      setTableMissing(error.message.toLowerCase().includes('could not find') || error.message.toLowerCase().includes('relation'))
      showToast('error', error.message)
      return
    }

    setLeads((data ?? []) as LeadRow[])
  }, [sb])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const selectedLead = useMemo(() => {
    if (!selectedId) return leads[0] ?? null
    return leads.find((lead) => s(lead.id) === selectedId) ?? leads[0] ?? null
  }, [leads, selectedId])

  useEffect(() => {
    setEditForm(makeEditForm(selectedLead))
  }, [selectedLead])

  const filteredLeads = useMemo(() => {
    const term = query.trim().toLowerCase()
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000

    return leads.filter((lead) => {
      const status = getLeadStatus(lead)
      const priority = getLeadPriority(lead)
      if (statusFilter !== 'all' && status !== statusFilter) return false
      if (priorityFilter !== 'all' && priority !== priorityFilter) return false

      if (dateFilter !== 'all') {
        const created = new Date(s(lead.created_at)).getTime()
        if (Number.isNaN(created)) return false
        if (dateFilter === 'today' && toDateOnly(lead.created_at) !== new Date().toISOString().slice(0, 10)) return false
        if (dateFilter === '7days' && now - created > 7 * day) return false
        if (dateFilter === '30days' && now - created > 30 * day) return false
      }

      if (!term) return true
      const haystack = [
        getLeadName(lead),
        getLeadPhone(lead),
        s(lead.email),
        getLeadCity(lead),
        s(lead.area),
        getLeadService(lead),
        getLeadVehicle(lead),
        s(lead.message),
        s(lead.form_type),
        s(lead.page_url),
      ].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [leads, query, statusFilter, priorityFilter, dateFilter])

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      total: leads.length,
      newLeads: leads.filter((lead) => getLeadStatus(lead) === 'new').length,
      today: leads.filter((lead) => toDateOnly(lead.created_at) === today).length,
      urgent: leads.filter((lead) => getLeadPriority(lead) === 'urgent' || getLeadPriority(lead) === 'high').length,
      converted: leads.filter((lead) => getLeadStatus(lead) === 'converted').length,
    }
  }, [leads])

  const updateLead = async () => {
    if (!selectedLead?.id) return

    setSaving(true)
    const payload: Record<string, unknown> = {
      status: editForm.status,
      priority: editForm.priority,
      notes: editForm.notes.trim() || null,
      assigned_to: editForm.assigned_to.trim() || null,
      follow_up_at: editForm.follow_up_at ? new Date(editForm.follow_up_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    if (['contacted', 'qualified', 'converted'].includes(editForm.status) && !selectedLead.last_contacted_at) {
      payload.last_contacted_at = new Date().toISOString()
    }

    const { error } = await sb
      .from('leads')
      .update(payload)
      .eq('id', s(selectedLead.id))

    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    showToast('success', 'Lead updated.')
    fetchLeads()
  }

  const quickStatus = async (lead: LeadRow, status: LeadStatus) => {
    const payload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (['contacted', 'qualified', 'converted'].includes(status) && !lead.last_contacted_at) {
      payload.last_contacted_at = new Date().toISOString()
    }

    const { error } = await sb.from('leads').update(payload).eq('id', lead.id)
    if (error) {
      showToast('error', error.message)
      return
    }
    showToast('success', `Lead marked ${status}.`)
    fetchLeads()
  }

  const exportCsv = () => {
    const headers = ['created_at', 'status', 'priority', 'name', 'phone', 'email', 'city', 'area', 'service', 'vehicle_type', 'message', 'form_type', 'page_url', 'assigned_to', 'follow_up_at', 'notes']
    const rows = filteredLeads.map((lead) => headers.map((key) => csvEscape(lead[key])).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fiixup-leads-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const copyLead = async (lead: LeadRow) => {
    try {
      await navigator.clipboard.writeText(buildLeadSummary(lead))
      showToast('success', 'Lead copied.')
    } catch {
      showToast('error', 'Unable to copy lead.')
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <Inbox className="w-6 h-6 text-blue-400" />
            Leads
          </h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-2xl">
            Store and manage all Fiixup website enquiries from contact forms, city hero forms, quick callback popups and service booking forms.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={fetchLeads} className="admin-btn-secondary" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
          <button type="button" onClick={exportCsv} className="admin-btn-primary" disabled={!filteredLeads.length}>
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {tableMissing && (
        <div className="admin-card p-5 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-300 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-200">Leads table is not ready yet.</p>
              <p className="text-sm text-yellow-100/80 mt-1">
                Run the supplied Supabase SQL file first, then refresh this page. The frontend form API also needs SUPABASE_SERVICE_ROLE_KEY to save leads from public forms.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Leads', value: stats.total, icon: Inbox },
          { label: 'New', value: stats.newLeads, icon: AlertCircle },
          { label: 'Today', value: stats.today, icon: CalendarClock },
          { label: 'High Priority', value: stats.urgent, icon: ShieldAlert },
          { label: 'Converted', value: stats.converted, icon: CheckCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="admin-card p-4 text-center">
            <Icon className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-extrabold text-white">{value}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="admin-card p-4">
        <div className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6b7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, phone, city, service, message or page URL..."
              className="admin-input pl-9"
            />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as LeadStatus | 'all')} className="admin-input">
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as LeadPriority | 'all')} className="admin-input">
            <option value="all">All priorities</option>
            {PRIORITY_OPTIONS.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
          </select>
          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)} className="admin-input">
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
          </select>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] gap-5 items-start">
        <div className="admin-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a2d3e] flex items-center justify-between">
            <p className="font-semibold text-white">Latest enquiries</p>
            <p className="text-xs text-[#6b7280]">Showing {filteredLeads.length} of {leads.length}</p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#94a3b8]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-400" />
              Loading leads...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-10 text-center text-[#94a3b8]">
              <Inbox className="w-8 h-8 mx-auto mb-3 text-[#4b5563]" />
              No leads found for the selected filters.
            </div>
          ) : (
            <div className="divide-y divide-[#2a2d3e]">
              {filteredLeads.map((lead) => {
                const id = s(lead.id)
                const phone = getLeadPhone(lead)
                const whatsapp = phoneToWhatsapp(phone)
                const selected = selectedLead && s(selectedLead.id) === id
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setSelectedId(id)}
                    className={clsx(
                      'w-full text-left p-4 transition-colors hover:bg-[#202433]',
                      selected && 'bg-blue-600/10'
                    )}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white truncate">{getLeadName(lead)}</p>
                          <span className={clsx('text-[11px] px-2 py-0.5 rounded-full border capitalize', statusClass(getLeadStatus(lead)))}>{getLeadStatus(lead)}</span>
                          <span className={clsx('text-[11px] px-2 py-0.5 rounded-full border capitalize', priorityClass(getLeadPriority(lead)))}>{getLeadPriority(lead)}</span>
                        </div>
                        <p className="text-sm text-[#94a3b8] mt-1">
                          {getLeadService(lead)}{getLeadCity(lead) ? ` · ${getLeadCity(lead)}` : ''}{getLeadVehicle(lead) ? ` · ${getLeadVehicle(lead)}` : ''}
                        </p>
                        {s(lead.message) && (
                          <p className="text-xs text-[#6b7280] mt-1 line-clamp-2">{s(lead.message)}</p>
                        )}
                        <p className="text-[11px] text-[#4b5563] mt-2">{toDisplayDate(lead.created_at)} · {s(lead.form_type, 'Website form')}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {phone && (
                          <a
                            href={`tel:${phoneToTel(phone)}`}
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#2a2d3e] px-2.5 py-1.5 text-xs text-[#e2e8f0] hover:bg-[#323548]"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>
                        )}
                        {whatsapp && (
                          <a
                            href={`https://wa.me/${whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-600/10 px-2.5 py-1.5 text-xs text-green-300 hover:bg-green-600/20"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="admin-card p-5 sticky top-6">
          {selectedLead ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[#6b7280] uppercase tracking-wider font-semibold">Lead details</p>
                  <h2 className="text-lg font-bold text-white mt-1">{getLeadName(selectedLead)}</h2>
                  <p className="text-sm text-[#94a3b8]">{getLeadService(selectedLead)}</p>
                </div>
                <button type="button" onClick={() => copyLead(selectedLead)} className="admin-btn-secondary !px-3">
                  <Clipboard className="w-4 h-4" /> Copy
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Info label="Phone" value={getLeadPhone(selectedLead)} icon={Phone} href={getLeadPhone(selectedLead) ? `tel:${phoneToTel(getLeadPhone(selectedLead))}` : undefined} />
                <Info label="Email" value={s(selectedLead.email)} icon={Mail} href={s(selectedLead.email) ? `mailto:${s(selectedLead.email)}` : undefined} />
                <Info label="City / Area" value={[getLeadCity(selectedLead), s(selectedLead.area)].filter(Boolean).join(' · ')} />
                <Info label="Vehicle" value={[getLeadVehicle(selectedLead), s(selectedLead.vehicle_model)].filter(Boolean).join(' · ')} />
                <Info label="Created" value={toDisplayDate(selectedLead.created_at)} />
                <Info label="Last contacted" value={toDisplayDate(selectedLead.last_contacted_at)} />
              </div>

              {s(selectedLead.message) && (
                <div>
                  <p className="admin-label">Customer message</p>
                  <div className="rounded-xl border border-[#2a2d3e] bg-[#0f1117] p-3 text-sm text-[#e2e8f0] whitespace-pre-wrap leading-relaxed">
                    {s(selectedLead.message)}
                  </div>
                </div>
              )}

              {s(selectedLead.page_url) && (
                <a
                  href={s(selectedLead.page_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 break-all"
                >
                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  {s(selectedLead.page_url)}
                </a>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="admin-label">Status</label>
                  <select value={editForm.status} onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value as LeadStatus }))} className="admin-input">
                    {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label} — {status.helper}</option>)}
                  </select>
                </div>
                <div>
                  <label className="admin-label">Priority</label>
                  <select value={editForm.priority} onChange={(event) => setEditForm((prev) => ({ ...prev, priority: event.target.value as LeadPriority }))} className="admin-input">
                    {PRIORITY_OPTIONS.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="admin-label">Assigned to</label>
                  <input value={editForm.assigned_to} onChange={(event) => setEditForm((prev) => ({ ...prev, assigned_to: event.target.value }))} placeholder="Team member name" className="admin-input" />
                </div>
                <div>
                  <label className="admin-label">Follow-up date</label>
                  <input type="datetime-local" value={editForm.follow_up_at} onChange={(event) => setEditForm((prev) => ({ ...prev, follow_up_at: event.target.value }))} className="admin-input" />
                </div>
              </div>

              <div>
                <label className="admin-label">Internal notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={5}
                  placeholder="Call summary, price discussed, customer requirement, follow-up status..."
                  className="admin-textarea"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={updateLead} disabled={saving} className="admin-btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Lead
                </button>
                <button type="button" onClick={() => quickStatus(selectedLead, 'contacted')} className="admin-btn-secondary">
                  Mark contacted
                </button>
                <button type="button" onClick={() => quickStatus(selectedLead, 'converted')} className="admin-btn-secondary">
                  Mark converted
                </button>
              </div>

              {selectedLead.raw_payload !== undefined && selectedLead.raw_payload !== null && (
                <details className="rounded-xl border border-[#2a2d3e] bg-[#0f1117]">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[#94a3b8]">Raw form payload</summary>
                  <pre className="p-3 pt-0 text-[11px] text-[#6b7280] overflow-auto max-h-56">
                    {JSON.stringify(selectedLead.raw_payload, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-[#94a3b8]">
              <Inbox className="w-8 h-8 mx-auto mb-3 text-[#4b5563]" />
              Select a lead to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Info({ label, value, href, icon: Icon }: { label: string; value: string; href?: string; icon?: ElementType }) {
  const content = value || 'Not provided'
  return (
    <div className="rounded-xl border border-[#2a2d3e] bg-[#0f1117] p-3 min-w-0">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-[#6b7280] mb-1">{label}</p>
      {href ? (
        <a href={href} className="inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-blue-200 break-all">
          {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
          {content}
        </a>
      ) : (
        <p className="text-sm text-[#e2e8f0] break-words">{content}</p>
      )}
    </div>
  )
}
