'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { revalidateBrandLogos } from '@/lib/actions'
import { MediaLibraryPicker, type MediaLibraryItem } from '@/components/media/MediaLibraryPicker'
import {
  Award,
  Bike,
  Car,
  FolderOpen,
  GripVertical,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from 'lucide-react'
import { clsx } from 'clsx'

type BrandLogo = {
  id: string
  name: string
  logo_url: string | null
  vehicle_type: 'car' | 'bike'
  sort_order: number
  is_active: boolean
}

type BrandForm = {
  name: string
  logo_url: string
  vehicle_type: 'car' | 'bike'
  sort_order: string
  is_active: boolean
}

const EMPTY_FORM: BrandForm = {
  name: '',
  logo_url: '',
  vehicle_type: 'car',
  sort_order: '0',
  is_active: true,
}

function toForm(row: BrandLogo): BrandForm {
  return {
    name: row.name,
    logo_url: row.logo_url ?? '',
    vehicle_type: row.vehicle_type,
    sort_order: String(row.sort_order),
    is_active: row.is_active,
  }
}

function toPayload(form: BrandForm) {
  return {
    name: form.name.trim(),
    logo_url: form.logo_url.trim() || null,
    vehicle_type: form.vehicle_type,
    sort_order: Number.isFinite(Number(form.sort_order)) ? Number(form.sort_order) : 0,
    is_active: Boolean(form.is_active),
  }
}

export default function BrandLogosPage() {
  const sb = getBrowserClient()
  const [brands, setBrands] = useState<BrandLogo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'car' | 'bike'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newBrand, setNewBrand] = useState<BrandForm>({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<BrandForm>({ ...EMPTY_FORM })
  const [pickerTarget, setPickerTarget] = useState<'new' | 'edit' | null>(null)

  const fetchBrands = useCallback(async () => {
    setLoading(true)
    const { data, error } = await sb
      .from('brand_logos')
      .select('*')
      .order('sort_order', { ascending: true })

    setLoading(false)

    if (error) {
      showToast('error', error.message)
      setBrands([])
      return
    }

    setBrands((data ?? []) as BrandLogo[])
  }, [sb])

  useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

  const filteredBrands = useMemo(() => {
    const term = query.trim().toLowerCase()
    return brands.filter((brand) => {
      if (typeFilter !== 'all' && brand.vehicle_type !== typeFilter) return false
      if (!term) return true
      return brand.name.toLowerCase().includes(term)
    })
  }, [brands, query, typeFilter])

  const stats = useMemo(() => {
    const total = brands.length
    const cars = brands.filter((b) => b.vehicle_type === 'car').length
    const bikes = brands.filter((b) => b.vehicle_type === 'bike').length
    const active = brands.filter((b) => b.is_active).length
    return { total, cars, bikes, active }
  }, [brands])

  const createBrand = async () => {
    const payload = toPayload(newBrand)

    if (!payload.name) {
      showToast('error', 'Brand name is required.')
      return
    }

    setSaving(true)
    const { error } = await sb.from('brand_logos').insert(payload)
    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateBrandLogos()
    showToast('success', revalidate.success ? 'Brand added and live cache cleared.' : 'Brand added. Live site may update within 1 hour.')
    setNewBrand({ ...EMPTY_FORM })
    setShowCreate(false)
    fetchBrands()
  }

  const startEdit = (brand: BrandLogo) => {
    setEditingId(brand.id)
    setEditForm(toForm(brand))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ ...EMPTY_FORM })
  }

  const saveBrand = async (brand: BrandLogo) => {
    const payload = toPayload(editForm)

    if (!payload.name) {
      showToast('error', 'Brand name is required.')
      return
    }

    setSaving(true)
    const { error } = await sb
      .from('brand_logos')
      .update(payload)
      .eq('id', brand.id)
    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateBrandLogos()
    showToast('success', revalidate.success ? 'Brand saved and live cache cleared.' : 'Brand saved. Live site may update within 1 hour.')
    cancelEdit()
    fetchBrands()
  }

  const deleteBrand = async (brand: BrandLogo) => {
    if (!confirm(`Delete "${brand.name}"?`)) return

    const { error } = await sb.from('brand_logos').delete().eq('id', brand.id)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateBrandLogos()
    showToast('success', revalidate.success ? 'Brand deleted and live cache cleared.' : 'Brand deleted. Live site may update within 1 hour.')
    fetchBrands()
  }

  const handlePickFromLibrary = (item: MediaLibraryItem) => {
    if (pickerTarget === 'new') {
      setNewBrand((current) => ({ ...current, logo_url: item.public_url }))
    } else if (pickerTarget === 'edit') {
      setEditForm((current) => ({ ...current, logo_url: item.public_url }))
    }
    setPickerTarget(null)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-400" />
            Brand Logos
          </h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-2xl">
            Manage the car &amp; bike brand logos shown in the homepage &quot;We Service Every Major Brand&quot; marquee.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={fetchBrands} className="admin-btn-secondary" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
          <button onClick={() => setShowCreate((open) => !open)} className="admin-btn-primary">
            <Plus className="w-4 h-4" />
            Add Brand
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.total}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Total Brands</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.cars}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Car Brands</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.bikes}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Bike Brands</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.active}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Active (shown live)</p>
        </div>
      </div>

      {showCreate && (
        <div className="admin-card p-5 space-y-4 border-dashed">
          <div>
            <p className="text-sm font-semibold text-white">Add new brand</p>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Choose the brand&apos;s official logo (ideally transparent PNG) from Media Library. It appears in the homepage marquee once active.
            </p>
          </div>
          <BrandFormFields
            form={newBrand}
            setForm={setNewBrand}
            onPickClick={() => setPickerTarget('new')}
          />
          <div className="flex gap-2">
            <button onClick={createBrand} disabled={saving} className="admin-btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Brand
            </button>
            <button onClick={() => setShowCreate(false)} className="admin-btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="admin-card p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search brand name…"
            className="admin-input pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as 'all' | 'car' | 'bike')}
          className="admin-input md:w-48"
        >
          <option value="all">All vehicle types</option>
          <option value="car">Car</option>
          <option value="bike">Bike</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <Award className="w-8 h-8 text-[#4b5563] mx-auto mb-3" />
          <p className="text-sm text-[#94a3b8]">No brands found.</p>
          <p className="text-xs text-[#6b7280] mt-1">Add your first brand logo above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBrands.map((brand) => {
            const editing = editingId === brand.id
            return (
              <div key={brand.id} className="admin-card p-5 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <GripVertical className="hidden w-4 h-4 text-[#374151] md:block flex-shrink-0" />
                    <div className="flex h-16 w-28 flex-shrink-0 items-center justify-center rounded-xl border border-[#2a2d3e] bg-white p-2">
                      {brand.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brand.logo_url} alt={brand.name} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-[#94a3b8]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[#e2e8f0]">{brand.name}</p>
                        <span className={clsx(
                          'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-semibold',
                          brand.vehicle_type === 'bike'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                        )}>
                          {brand.vehicle_type === 'bike' ? <Bike className="w-3 h-3" /> : <Car className="w-3 h-3" />}
                          {brand.vehicle_type}
                        </span>
                        {!brand.is_active && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-500/10 text-gray-400 border-gray-500/20 font-semibold">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6b7280] mt-1">Sort order: {brand.sort_order}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(brand)} className="admin-btn-secondary">Edit</button>
                    <button onClick={() => deleteBrand(brand)} className="admin-btn-danger">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>

                {editing && (
                  <div className="border-t border-[#2a2d3e] pt-4 space-y-4">
                    <BrandFormFields
                      form={editForm}
                      setForm={setEditForm}
                      onPickClick={() => setPickerTarget('edit')}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveBrand(brand)} disabled={saving} className="admin-btn-primary">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Brand
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

      {pickerTarget && (
        <MediaLibraryPicker
          folder="brands"
          onSelect={handlePickFromLibrary}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  )
}

function BrandFormFields({ form, setForm, onPickClick }: {
  form: BrandForm
  setForm: React.Dispatch<React.SetStateAction<BrandForm>>
  onPickClick: () => void
}) {
  const update = (key: keyof BrandForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="md:col-span-2 flex items-center gap-4">
        <div className="flex h-20 w-32 flex-shrink-0 items-center justify-center rounded-xl border border-[#2a2d3e] bg-white p-2">
          {form.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logo_url} alt="Logo preview" className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageIcon className="w-6 h-6 text-[#94a3b8]" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onPickClick} className="admin-btn-secondary">
            <FolderOpen className="w-4 h-4" />
            Choose from Media Library
          </button>
          <p className="text-xs text-[#6b7280]">
            Logo not uploaded yet?{' '}
            <Link href="/media" className="text-blue-400 hover:underline">Upload it in Media Library</Link>, then choose it here.
          </p>
        </div>
      </div>
      <div>
        <label className="admin-label">Brand Name *</label>
        <input
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
          className="admin-input"
          placeholder="Maruti Suzuki, Royal Enfield…"
        />
      </div>
      <div>
        <label className="admin-label">Vehicle Type *</label>
        <select
          value={form.vehicle_type}
          onChange={(event) => update('vehicle_type', event.target.value)}
          className="admin-input"
        >
          <option value="car">Car</option>
          <option value="bike">Bike</option>
        </select>
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
      <label className="flex items-center gap-3 text-sm text-[#cbd5e1]">
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
