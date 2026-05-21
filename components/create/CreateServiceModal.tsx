'use client'
// components/create/CreateServiceModal.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { CreateModal, CField, CSelect } from '@/components/ui/CreateModal'
import { Loader2 } from 'lucide-react'

const CATEGORIES = ['battery','bike','car','mechanic','puncture','roadside','towing']

interface Props { open: boolean; onClose: () => void; onCreated: () => void }

export function CreateServiceModal({ open, onClose, onCreated }: Props) {
  const router = useRouter()
  const sb = getBrowserClient()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    title:'', short_title:'', slug:'', category:'', tagline:'', price:'', duration:'', icon:'Wrench',
  })
  const f = (key: string) => (v: string) => setForm(p => ({ ...p, [key]: v }))

  const handleTitle = (v: string) => setForm(p => ({
    ...p, title: v, short_title: v,
    slug: v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
  }))

  const create = async () => {
    if (!form.title || !form.slug || !form.category) { showToast('error', 'Title, slug and category required'); return }
    setBusy(true)
    const { data, error } = await sb.from('services').insert({
      title: form.title, short_title: form.short_title || form.title,
      slug: form.slug, category: form.category,
      tagline: form.tagline, price: form.price, duration: form.duration, icon: form.icon,
      description: `Professional ${form.title.toLowerCase()} at your doorstep. Certified mechanics, upfront pricing, 30-day warranty.`,
      features: [], faqs: [], benefits: [], car_brands: [], bike_brands: [], related_slugs: [],
      meta_title: `${form.title} — Doorstep Service | Fiixup`,
      meta_description: `Book ${form.title.toLowerCase()} at your doorstep. Certified mechanics, transparent pricing, 30-day warranty.`,
    }).select('slug').single()
    setBusy(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Service created')
    router.push(`/services/${data.slug}`)
    onCreated(); onClose()
    setForm({ title:'',short_title:'',slug:'',category:'',tagline:'',price:'',duration:'',icon:'Wrench' })
  }

  return (
    <CreateModal open={open} onClose={onClose} title="Create New Service" subtitle="Global service in the catalogue" width="lg">
      <div className="space-y-4">
        <CField label="Service Title" value={form.title} onChange={handleTitle}
          placeholder="Car Oil Change at Home" required hint="Auto-generates slug" />
        <div className="grid grid-cols-2 gap-4">
          <CField label="Short Title" value={form.short_title} onChange={f('short_title')} placeholder="Car Oil Change" />
          <CField label="URL Slug" value={form.slug} onChange={f('slug')} placeholder="car-oil-change-at-home" required />
        </div>
        <CSelect label="Category" value={form.category} onChange={f('category')} required
          options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase()+c.slice(1) }))} />
        <CField label="Tagline" value={form.tagline} onChange={f('tagline')} placeholder="Fresh oil at your doorstep in 45 minutes" />
        <div className="grid grid-cols-3 gap-3">
          <CField label="Price (e.g. ₹599)" value={form.price}    onChange={f('price')}    placeholder="₹599" />
          <CField label="Duration"           value={form.duration} onChange={f('duration')} placeholder="45–60 min" />
          <CField label="Lucide Icon Name"   value={form.icon}     onChange={f('icon')}     placeholder="Wrench" />
        </div>
        <button onClick={create} disabled={busy||!form.title||!form.slug||!form.category} className="admin-btn-primary w-full justify-center">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {busy ? 'Creating…' : 'Create Service & Open Editor →'}
        </button>
      </div>
    </CreateModal>
  )
}
