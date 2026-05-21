'use client'
// components/create/CreateCityModal.tsx
// 3-step wizard: Basic Info → Areas → Done
// Auto-creates 7 city_service_pages (one per category)

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { CreateModal, StepBar, CField } from '@/components/ui/CreateModal'
import { Loader2, Plus, Trash2, Check } from 'lucide-react'

const CATEGORIES = [
  { id: '0ff030c2-5af9-4dba-ae60-bc5563294baa', slug: 'battery',  title: 'Battery Services'   },
  { id: '8750d9b1-c255-4e50-954a-3b3db7f51d3a', slug: 'bike',     title: 'Bike Services'       },
  { id: '4df1d142-8b8b-4637-a4d1-959e01cb43c2', slug: 'car',      title: 'Car Services'        },
  { id: 'f6b0b360-fb48-45a0-ac8f-d6e7c4abf0c3', slug: 'mechanic', title: 'Mechanic Services'   },
  { id: '9566fc80-dabb-4b84-9565-7e053034313f', slug: 'puncture', title: 'Puncture Services'   },
  { id: '13bdae9d-cd04-470d-bc73-42d93aa6923a', slug: 'roadside', title: 'Roadside Assistance' },
  { id: '19ce1deb-722a-4823-8009-a0b79545f4e4', slug: 'towing',   title: 'Towing Services'     },
]

const STEPS = ['Basic Info', 'Areas', 'Done']

interface Props { open: boolean; onClose: () => void; onCreated: () => void }

export function CreateCityModal({ open, onClose, onCreated }: Props) {
  const router = useRouter()
  const sb = getBrowserClient()
  const [step,     setStep]     = useState(0)
  const [busy,     setBusy]     = useState(false)
  const [cityId,   setCityId]   = useState('')
  const [citySlug, setCitySlug] = useState('')
  const [form, setForm] = useState({
    name:'', slug:'', state:'', phone:'', whatsapp:'', email:'',
    hero_tagline:'', meta_title:'', meta_description:'',
    stats_customers:'10,000+', stats_satisfaction:'98%', stats_coverage:'',
  })
  const [areas, setAreas] = useState([{ name:'', slug:'', highlight:'', sort_order:0 }])
  const f = (key: string) => (v: string) => setForm(p => ({ ...p, [key]: v }))

  const handleName = (v: string) => setForm(p => ({
    ...p, name: v,
    slug:              v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
    stats_coverage:    v ? `All of ${v}` : '',
    meta_title:        v ? `Doorstep Car & Bike Repair in ${v} | Fiixup` : '',
    meta_description:  v ? `Fiixup provides certified doorstep car and bike repair in ${v}. Battery, tyre, oil change, towing & more. Mechanics reach you in 30–60 min.` : '',
    hero_tagline:      v ? `${v}'s Trusted Doorstep Car & Bike Repair` : '',
  }))

  const createCity = async () => {
    if (!form.name || !form.slug) { showToast('error', 'Name and slug required'); return }
    setBusy(true)
    const { data: city, error } = await sb.from('cities').insert({
      name: form.name, slug: form.slug, state: form.state,
      phone: form.phone, whatsapp: form.whatsapp || form.phone, email: form.email,
      hero_tagline: form.hero_tagline, meta_title: form.meta_title,
      meta_description: form.meta_description,
      stats_customers: form.stats_customers, stats_satisfaction: form.stats_satisfaction,
      stats_coverage: form.stats_coverage, stats_label: 'Happy Customers',
      testimonials_heading: `What ${form.name} Customers Say`,
      services_section_heading: `Doorstep Services in ${form.name}`,
      car_services_heading: `Car Services in ${form.name}`,
      bike_services_heading: `Bike Services in ${form.name}`,
    }).select('id,slug').single()
    if (error) { showToast('error', error.message); setBusy(false); return }
    setCityId(city.id); setCitySlug(city.slug)
    // Auto-create 7 CSPs
    await sb.from('city_service_pages').insert(CATEGORIES.map(cat => ({
      city_id: city.id, service_category_id: cat.id,
      city_slug: city.slug, category_slug: cat.slug,
      meta_title: `${cat.title} in ${form.name} — Doorstep Service | Fiixup`,
      meta_description: `Get doorstep ${cat.title.toLowerCase()} in ${form.name}. Certified mechanics in 30–60 min. Transparent pricing, 30-day warranty.`,
      canonical_url: `https://fiixup.in/${city.slug}/services/${cat.slug}`,
      hero_heading: `${cat.title} in ${form.name} — We Come to You`,
      hero_subheading: `Certified mechanics provide doorstep ${cat.title.toLowerCase()} anywhere in ${form.name} — 24/7, with upfront pricing.`,
      about_heading: `Trusted ${cat.title} Across ${form.name}`,
      about_para1: `Fiixup brings certified mechanics directly to your location in ${form.name} for ${cat.title.toLowerCase()} — home, office, or roadside.`,
      about_para2: `Every job includes a digital job card, upfront pricing, and a 30-day warranty. No hidden charges.`,
      about_bullets: [], service_highlights: [], why_choose_points: [], is_active: true,
    })))
    showToast('success', `${form.name} created with 7 service pages`)
    setBusy(false); setStep(1)
  }

  const createAreas = async () => {
    const valid = areas.filter(a => a.name && a.slug)
    if (valid.length === 0) { setStep(2); return }
    setBusy(true)
    const { error } = await sb.from('areas').insert(
      valid.map((a, i) => ({ city_id: cityId, city_slug: citySlug, name: a.name, slug: a.slug, highlight: a.highlight, sort_order: i, is_active: true }))
    )
    setBusy(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', `${valid.length} areas added`); setStep(2)
  }

  const addArea = () => setAreas(p => [...p, { name:'', slug:'', highlight:'', sort_order: p.length }])
  const removeArea = (i: number) => setAreas(p => p.filter((_, idx) => idx !== i))
  const updateArea = (i: number, key: string, val: string) =>
    setAreas(p => p.map((a, idx) => idx === i ? {
      ...a, [key]: val,
      ...(key === 'name' ? { slug: val.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') } : {})
    } : a))

  const reset = () => {
    setStep(0); setCityId(''); setCitySlug('')
    setForm({ name:'',slug:'',state:'',phone:'',whatsapp:'',email:'',hero_tagline:'',meta_title:'',meta_description:'',stats_customers:'10,000+',stats_satisfaction:'98%',stats_coverage:'' })
    setAreas([{ name:'',slug:'',highlight:'',sort_order:0 }])
  }

  return (
    <CreateModal open={open} onClose={() => { reset(); onClose() }}
      title="Create New City" subtitle="City + 7 service pages + areas in one step" width="xl">
      <StepBar steps={STEPS} current={step} />

      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CField label="City Name" value={form.name} onChange={handleName} placeholder="Pune" required hint="Auto-fills slug and meta fields" />
            <CField label="URL Slug"  value={form.slug} onChange={f('slug')} placeholder="pune" required hint={`fiixup.in/${form.slug||'slug'}`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CField label="State" value={form.state} onChange={f('state')} placeholder="Maharashtra" />
            <CField label="Phone" value={form.phone} onChange={f('phone')} placeholder="+91 81974 59732" />
          </div>
          <CField label="Email" value={form.email} onChange={f('email')} placeholder="pune@fiixup.in" />
          <CField label="Hero Tagline" value={form.hero_tagline} onChange={f('hero_tagline')} />
          <CField label="Meta Title" value={form.meta_title} onChange={f('meta_title')} />
          <CField label="Meta Description" value={form.meta_description} onChange={f('meta_description')} multiline rows={2} />
          <div className="grid grid-cols-3 gap-3">
            <CField label="Customers" value={form.stats_customers} onChange={f('stats_customers')} placeholder="10,000+" />
            <CField label="Satisfaction" value={form.stats_satisfaction} onChange={f('stats_satisfaction')} placeholder="98%" />
            <CField label="Coverage" value={form.stats_coverage} onChange={f('stats_coverage')} />
          </div>
          <div className="bg-[#0f1117] rounded-xl p-3 border border-[#2a2d3e]">
            <p className="text-xs text-[#6b7280] mb-2 font-semibold">Auto-creates these service pages:</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <span key={c.slug} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                  /{form.slug||'city'}/services/{c.slug}
                </span>
              ))}
            </div>
          </div>
          <button onClick={createCity} disabled={busy||!form.name||!form.slug} className="admin-btn-primary w-full justify-center">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {busy ? 'Creating city…' : 'Create City & 7 Service Pages →'}
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-[#6b7280]">Add areas/neighbourhoods in <strong className="text-[#e2e8f0]">{form.name}</strong>. Add more later from the city editor.</p>
          <div className="grid grid-cols-12 gap-2 text-xs text-[#6b7280]">
            <span className="col-span-4">Area Name</span><span className="col-span-3">URL Slug</span><span className="col-span-4">Highlight Tag</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {areas.map((area, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input className="col-span-4 admin-input text-sm" value={area.name} onChange={e => updateArea(i,'name',e.target.value)} placeholder="Baner" />
                <input className="col-span-3 admin-input text-sm" value={area.slug} onChange={e => updateArea(i,'slug',e.target.value)} placeholder="baner" />
                <input className="col-span-4 admin-input text-sm" value={area.highlight} onChange={e => updateArea(i,'highlight',e.target.value)} placeholder="IT Hub" />
                <button onClick={() => removeArea(i)} className="col-span-1 text-[#6b7280] hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <button onClick={addArea} className="admin-btn-secondary w-full justify-center"><Plus className="w-4 h-4" /> Add Area</button>
          <button onClick={createAreas} disabled={busy} className="admin-btn-primary w-full justify-center">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {busy ? 'Saving areas…' : 'Save Areas →'}
          </button>
          <button onClick={() => setStep(2)} className="w-full text-center text-sm text-[#6b7280] hover:text-white py-1">Skip</button>
        </div>
      )}

      {step === 2 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#e2e8f0]">{form.name} is ready!</h3>
            <p className="text-sm text-[#6b7280] mt-1">City · 7 service pages · {areas.filter(a=>a.name).length} areas</p>
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => { router.push(`/cities/${citySlug}`); reset(); onClose(); onCreated() }} className="admin-btn-primary">
              Open {form.name} Editor →
            </button>
            <button onClick={() => { reset(); onClose(); onCreated() }} className="admin-btn-secondary">Back to Cities</button>
          </div>
        </div>
      )}
    </CreateModal>
  )
}
