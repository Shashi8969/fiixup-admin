'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { revalidateSiteSettings } from '@/lib/actions'
import {
  CheckCircle,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  XCircle,
} from 'lucide-react'
import { clsx } from 'clsx'

type SiteSetting = {
  key: string
  value: string | null
  group_name: string | null
  label: string | null
  description: string | null
  input_type: string | null
  sort_order: number | null
  is_public: boolean | null
  updated_at: string | null
}

type NewSettingForm = {
  key: string
  value: string
  group_name: string
  label: string
  description: string
  input_type: 'text' | 'textarea' | 'url' | 'email' | 'tel'
  sort_order: string
  is_public: boolean
}

const EMPTY_FORM: NewSettingForm = {
  key: '',
  value: '',
  group_name: 'general',
  label: '',
  description: '',
  input_type: 'text',
  sort_order: '100',
  is_public: true,
}

function clean(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  return String(value)
}

function groupLabel(group: string) {
  return group
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function inputType(type: string | null | undefined) {
  const value = clean(type, 'text').toLowerCase()
  if (['textarea', 'url', 'email', 'tel', 'number'].includes(value)) return value
  return 'text'
}

export default function SiteSettingsPage() {
  const sb = getBrowserClient()
  const [settings, setSettings] = useState<SiteSetting[]>([])
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newSetting, setNewSetting] = useState<NewSettingForm>({ ...EMPTY_FORM })

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    const { data, error } = await sb
      .from('site_settings')
      .select('key,value,group_name,label,description,input_type,sort_order,is_public,updated_at')
      .order('group_name', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('key', { ascending: true })

    setLoading(false)

    if (error) {
      showToast('error', error.message)
      setSettings([])
      setDraftValues({})
      return
    }

    const rows = (data ?? []) as SiteSetting[]
    setSettings(rows)
    setDraftValues(Object.fromEntries(rows.map((setting) => [setting.key, clean(setting.value)])))
  }, [sb])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const filteredSettings = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return settings

    return settings.filter((setting) => {
      const haystack = [
        setting.key,
        setting.label,
        setting.description,
        setting.group_name,
        setting.value,
      ].map((item) => clean(item).toLowerCase()).join(' ')

      return haystack.includes(term)
    })
  }, [settings, query])

  const groupedSettings = useMemo(() => {
    return filteredSettings.reduce<Record<string, SiteSetting[]>>((groups, setting) => {
      const group = clean(setting.group_name, 'general') || 'general'
      groups[group] = groups[group] ?? []
      groups[group].push(setting)
      return groups
    }, {})
  }, [filteredSettings])

  const stats = useMemo(() => {
    const total = settings.length
    const publicCount = settings.filter((setting) => setting.is_public !== false).length
    const groups = new Set(settings.map((setting) => clean(setting.group_name, 'general'))).size
    return { total, publicCount, groups }
  }, [settings])

  const updateDraftValue = (key: string, value: string) => {
    setDraftValues((current) => ({ ...current, [key]: value }))
  }

  const saveSetting = async (setting: SiteSetting) => {
    setSavingKey(setting.key)
    const { error } = await sb
      .from('site_settings')
      .update({
        value: draftValues[setting.key] ?? '',
        updated_at: new Date().toISOString(),
      })
      .eq('key', setting.key)

    setSavingKey(null)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateSiteSettings()
    showToast('success', revalidate.success ? 'Setting saved and live cache cleared.' : 'Setting saved. Live site may update within 1 hour.')
    fetchSettings()
  }

  const createSetting = async () => {
    const key = normalizeKey(newSetting.key)

    if (!key || !newSetting.label.trim()) {
      showToast('error', 'Setting key and label are required.')
      return
    }

    setSavingKey('__new__')
    const { error } = await sb.from('site_settings').insert({
      key,
      value: newSetting.value,
      group_name: newSetting.group_name.trim() || 'general',
      label: newSetting.label.trim(),
      description: newSetting.description.trim(),
      input_type: newSetting.input_type,
      sort_order: Number(newSetting.sort_order) || 100,
      is_public: Boolean(newSetting.is_public),
      updated_at: new Date().toISOString(),
    })
    setSavingKey(null)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateSiteSettings()
    showToast('success', revalidate.success ? 'Setting added and live cache cleared.' : 'Setting added. Live site may update within 1 hour.')
    setShowCreate(false)
    setNewSetting({ ...EMPTY_FORM })
    fetchSettings()
  }

  const renderSettingInput = (setting: SiteSetting) => {
    const value = draftValues[setting.key] ?? ''
    const type = inputType(setting.input_type)

    if (type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(event) => updateDraftValue(setting.key, event.target.value)}
          rows={3}
          className="admin-input min-h-[88px] resize-y"
        />
      )
    }

    return (
      <input
        value={value}
        type={type}
        onChange={(event) => updateDraftValue(setting.key, event.target.value)}
        className="admin-input"
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-400" />
            Site Settings
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Manage public phone, WhatsApp, email and footer text used by the live website.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchSettings}
            className="admin-btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            className="admin-btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Setting
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.total}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Total Settings</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.publicCount}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Public Frontend Values</p>
        </div>
        <div className="admin-card p-4 text-center col-span-2 md:col-span-1">
          <p className="text-2xl font-extrabold text-white">{stats.groups}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Groups</p>
        </div>
      </div>

      {showCreate && (
        <div className="admin-card p-5 space-y-4 border-blue-500/30">
          <div>
            <h2 className="text-white font-semibold">Add custom setting</h2>
            <p className="text-xs text-[#6b7280] mt-1">
              Use lowercase keys like <code>support_hours</code>. Existing frontend reads known keys automatically.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-[#94a3b8]">Key</span>
              <input
                value={newSetting.key}
                onChange={(event) => setNewSetting({ ...newSetting, key: event.target.value })}
                placeholder="support_hours"
                className="admin-input"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-[#94a3b8]">Label</span>
              <input
                value={newSetting.label}
                onChange={(event) => setNewSetting({ ...newSetting, label: event.target.value })}
                placeholder="Support Hours"
                className="admin-input"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-[#94a3b8]">Group</span>
              <input
                value={newSetting.group_name}
                onChange={(event) => setNewSetting({ ...newSetting, group_name: event.target.value })}
                placeholder="contact"
                className="admin-input"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-[#94a3b8]">Input Type</span>
              <select
                value={newSetting.input_type}
                onChange={(event) => setNewSetting({ ...newSetting, input_type: event.target.value as NewSettingForm['input_type'] })}
                className="admin-input"
              >
                <option value="text">Text</option>
                <option value="textarea">Textarea</option>
                <option value="url">URL</option>
                <option value="email">Email</option>
                <option value="tel">Phone</option>
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-[#94a3b8]">Value</span>
              <textarea
                value={newSetting.value}
                onChange={(event) => setNewSetting({ ...newSetting, value: event.target.value })}
                rows={3}
                className="admin-input min-h-[88px] resize-y"
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-[#94a3b8]">Description</span>
              <input
                value={newSetting.description}
                onChange={(event) => setNewSetting({ ...newSetting, description: event.target.value })}
                className="admin-input"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-[#94a3b8]">
              <input
                type="checkbox"
                checked={newSetting.is_public}
                onChange={(event) => setNewSetting({ ...newSetting, is_public: event.target.checked })}
              />
              Public frontend setting
            </label>
            <button
              type="button"
              onClick={createSetting}
              disabled={savingKey === '__new__'}
              className="admin-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
            >
              {savingKey === '__new__' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Setting
            </button>
          </div>
        </div>
      )}

      <div className="admin-card p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6b7280] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search settings..."
            className="admin-input pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="admin-card p-8 text-center text-[#94a3b8]">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Loading site settings...
        </div>
      ) : settings.length === 0 ? (
        <div className="admin-card p-8 text-center text-[#94a3b8]">
          No settings found. Run the Phase 9 SQL migration first.
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedSettings).map(([group, rows]) => (
            <section key={group} className="admin-card p-5 space-y-4">
              <div>
                <h2 className="text-white font-semibold">{groupLabel(group)}</h2>
                <p className="text-xs text-[#6b7280] mt-1">{rows.length} setting{rows.length === 1 ? '' : 's'}</p>
              </div>

              <div className="space-y-3">
                {rows.map((setting) => {
                  const changed = (draftValues[setting.key] ?? '') !== clean(setting.value)
                  const saving = savingKey === setting.key

                  return (
                    <div key={setting.key} className="rounded-xl border border-[#2a2d3e] bg-[#111827]/50 p-4 space-y-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[#e2e8f0]">{clean(setting.label, setting.key)}</p>
                            <span className="text-[11px] px-2 py-0.5 rounded-full border border-[#334155] text-[#94a3b8]">
                              {setting.key}
                            </span>
                            <span className={clsx(
                              'text-[11px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1',
                              setting.is_public !== false
                                ? 'bg-green-500/10 text-green-300 border-green-500/20'
                                : 'bg-red-500/10 text-red-300 border-red-500/20'
                            )}>
                              {setting.is_public !== false ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {setting.is_public !== false ? 'Public' : 'Private'}
                            </span>
                          </div>
                          {setting.description && (
                            <p className="text-xs text-[#6b7280] mt-1">{setting.description}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => saveSetting(setting)}
                          disabled={!changed || saving}
                          className="admin-btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save
                        </button>
                      </div>

                      {renderSettingInput(setting)}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
