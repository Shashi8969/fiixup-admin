'use client'
// components/create/CreateLSModal.tsx
// Create Location Service with template pre-fill

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { getBrowserClient }    from '@/lib/supabase'
import { showToast }           from '@/components/ui/Toast'
import { CreateModal, StepBar, CField, CSelect } from '@/components/ui/CreateModal'
import { Loader2, Check } from 'lucide-react'

const CATEGORIES = ['battery','bike','car','mechanic','puncture','roadside','towing']
const STEPS = ['Setup', 'Content', 'Done']

interface Props { open: boolean; onClose: () => void; onCreated: () => void }

export function CreateLSModal({ open, onClose, onCreated }: Props) {
  const router = useRouter()
  const sb = getBrowserClient()
  const [step,  setStep]  = useState(0)
  const [busy,  setBusy]  = useState(false)
  const [newId, setNewId] = useState<number | null>(null)
  const [cities, setCities] = useState<{ value: string; label: string }[]>([])
  const [areas,  setAreas]  = useState<{ value: string; label: string }[]>([])

  const [form, setForm] = useState({
    city_slug: '', city_name: '', area_slug: '', area_name: '',
    service_slug: '', service_name: '', service_category: '',
    is_city_level: true,
  })

  const [content, setContent] = useState({
    meta_title: '', meta_description: '', canonical_url: '',
    hero_heading: '', hero_subheading: '', about_heading: '',
    about_para1: '', about_para2: '',
  })

  const f  = (key: string) => (v: string) => setForm(p => ({ ...p, [key]: v }))
  const fc = (key: string) => (v: string) => setContent(p => ({ ...p, [key]: v }))

  // Load cities
  useEffect(() => {
    if (!open) return
    sb.from('cities').select('slug,name').then(({ data }) =>
      setCities((data ?? []).map(c => ({ value: c.slug, label: c.name })))
    )
  }, [open])

  // Load areas when city changes
  useEffect(() => {
    if (!form.city_slug) { setAreas([]); return }
    sb.from('areas').select('slug,name').eq('city_slug', form.city_slug).then(({ data }) =>
      setAreas((data ?? []).map(a => ({ value: a.slug, label: a.name })))
    )
    const city = cities.find(c => c.value === form.city_slug)
    if (city) setForm(p => ({ ...p, city_name: city.label }))
  }, [form.city_slug])

  // Auto-fill template when service name + category + city chosen
  const applyTemplate = (name: string, cat: string, cityName: string, citySlug: string, areaSlug: string) => {
    if (!name || !cat || !cityName) return
    const location = areaSlug ? `${areaSlug.replace(/-/g,' ')} in ${cityName}` : cityName
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
    setForm(p => ({ ...p, service_slug: slug }))
    setContent({
      meta_title:       `${name} in ${cityName} — Doorstep Service | Fiixup`,
      meta_description: `Get ${name.toLowerCase()} in ${cityName}. Certified mechanics reach you in 30–60 minutes. Transparent pricing, 30-day warranty. Call Fiixup now.`,
      canonical_url:    `https://fiixup.in/${citySlug}${areaSlug ? '/'+areaSlug : ''}/${slug}`,
      hero_heading:     `${name} in ${cityName} — We Come to You in 60 Minutes`,
      hero_subheading:  `Dead ${cat === 'battery' ? 'battery' : 'vehicle'}? Fiixup dispatches a certified mechanic to your location in ${location} — 24/7, with upfront pricing and a 30-day warranty.`,
      about_heading:    `Trusted ${name} in ${cityName}`,
      about_para1:      `When you need ${name.toLowerCase()} in ${cityName}, Fiixup brings a certified, background-verified mechanic directly to your location — home, office, or roadside. No waiting, no garage queues.`,
      about_para2:      `Every Fiixup ${name.toLowerCase()} job includes a digital job card, upfront pricing before work starts, and a 30-day workmanship warranty. All major vehicle brands covered.`,
    })
  }

  const handleServiceName = (v: string) => {
    setForm(p => ({ ...p, service_name: v, service_slug: v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') }))
    applyTemplate(v, form.service_category, form.city_name, form.city_slug, form.area_slug)
  }

  const handleCategory = (v: string) => {
    setForm(p => ({ ...p, service_category: v }))
    applyTemplate(form.service_name, v, form.city_name, form.city_slug, form.area_slug)
  }

  const handleCity = (v: string) => {
    setForm(p => ({ ...p, city_slug: v, area_slug: '', area_name: '' }))
  }

  const handleArea = (v: string) => {
    const area = areas.find(a => a.value === v)
    setForm(p => ({ ...p, area_slug: v, area_name: area?.label ?? '', is_city_level: !v }))
    applyTemplate(form.service_name, form.service_category, form.city_name, form.city_slug, v)
  }

  const goToContent = () => {
    if (!form.city_slug || !form.service_slug || !form.service_name || !form.service_category) {
      showToast('error', 'City, service name, slug and category are required'); return
    }
    applyTemplate(form.service_name, form.service_category, form.city_name, form.city_slug, form.area_slug)
    setStep(1)
  }

  const create = async () => {
    setBusy(true)
    const { data, error } = await sb.from('location_services').insert({
      city_slug:        form.city_slug,
      city_name:        form.city_name,
      area_slug:        form.area_slug || null,
      area_name:        form.area_name || null,
      service_slug:     form.service_slug,
      service_name:     form.service_name,
      service_category: form.service_category,
      ...content,
      city_id: (await sb.from('cities').select('id').eq('slug', form.city_slug).single()).data?.id,
      area_id: form.area_slug
        ? (await sb.from('areas').select('id').eq('city_slug', form.city_slug).eq('slug', form.area_slug).single()).data?.id
        : null,
      is_active: true,
    }).select('id').single()
    setBusy(false)
    if (error) { showToast('error', error.message); return }
    setNewId(data.id)
    showToast('success', 'Location service created')
    setStep(2)
  }

  const reset = () => {
    setStep(0); setNewId(null)
    setForm({ city_slug:'',city_name:'',area_slug:'',area_name:'',service_slug:'',service_name:'',service_category:'',is_city_level:true })
    setContent({ meta_title:'',meta_description:'',canonical_url:'',hero_heading:'',hero_subheading:'',about_heading:'',about_para1:'',about_para2:'' })
  }

  return (
    <CreateModal open={open} onClose={() => { reset(); onClose() }}
      title="Create Location Service" subtitle="City or area-level service page with template content" width="xl">
      <StepBar steps={STEPS} current={step} />

      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CSelect label="City" value={form.city_slug} onChange={handleCity} options={cities} required />
            <CSelect label="Area (leave blank for city-level)" value={form.area_slug} onChange={handleArea}
              options={areas} hint={form.is_city_level ? 'City-level service' : `Area: ${form.area_name}`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CField label="Service Name" value={form.service_name} onChange={handleServiceName}
              placeholder="Car Mechanic Near Me" required hint="Template auto-fills from this" />
            <CSelect label="Category" value={form.service_category} onChange={handleCategory} required
              options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase()+c.slice(1) }))} />
          </div>
          <CField label="URL Slug" value={form.service_slug} onChange={f('service_slug')}
            placeholder="car-mechanic-near-me" required
            hint={`fiixup.in/${form.city_slug||'city'}${form.area_slug?'/'+form.area_slug:''}/${form.service_slug||'slug'}`} />

          {content.hero_heading && (
            <div className="bg-[#0f1117] border border-[#2a2d3e] rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Template Preview</p>
              <p className="text-sm font-semibold text-[#e2e8f0]">{content.hero_heading}</p>
              <p className="text-xs text-[#6b7280]">{content.hero_subheading}</p>
            </div>
          )}

          <button onClick={goToContent} disabled={!form.city_slug||!form.service_name||!form.service_category} className="admin-btn-primary w-full justify-center">
            Review & Edit Content →
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-[#0f1117] rounded-lg px-4 py-2 text-xs text-[#6b7280] font-mono">
            {content.canonical_url}
          </div>
          <CField label="Meta Title"        value={content.meta_title}       onChange={fc('meta_title')} />
          <CField label="Meta Description"  value={content.meta_description} onChange={fc('meta_description')} multiline rows={2} />
          <CField label="Hero Heading"      value={content.hero_heading}     onChange={fc('hero_heading')} multiline rows={2} />
          <CField label="Hero Subheading"   value={content.hero_subheading}  onChange={fc('hero_subheading')} multiline rows={3} />
          <CField label="About Heading"     value={content.about_heading}    onChange={fc('about_heading')} />
          <CField label="About Paragraph 1" value={content.about_para1}     onChange={fc('about_para1')} multiline rows={4} />
          <CField label="About Paragraph 2" value={content.about_para2}     onChange={fc('about_para2')} multiline rows={4} />
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="admin-btn-secondary">← Back</button>
            <button onClick={create} disabled={busy} className="admin-btn-primary flex-1 justify-center">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {busy ? 'Creating…' : 'Create Location Service →'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#e2e8f0]">{form.service_name}</h3>
            <p className="text-sm text-[#6b7280] mt-1">{form.city_name}{form.area_slug ? ` · ${form.area_name}` : ' (city-level)'} · {form.service_category}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { router.push(`/location-services/${newId}`); reset(); onClose(); onCreated() }} className="admin-btn-primary">
              Open Full Editor →
            </button>
            <button onClick={() => { reset(); onClose(); onCreated() }} className="admin-btn-secondary">Done</button>
          </div>
        </div>
      )}
    </CreateModal>
  )
}
