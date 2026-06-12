'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { revalidateSeoPages } from '@/lib/actions'
import type { ElementType, ReactNode } from 'react'
import {
  Database,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Settings,
  Star,
} from 'lucide-react'

type Pair = { heading: string; text: string }
type Stat = { value: string; label: string }

type HomePageData = {
  hero: {
    badgeText: string
    heading: string
    subheading: string
    features: string[]
    avatars: string[]
    reviewText: string
    primaryCtaLabel: string
    primaryCtaHref: string
    secondaryCtaLabel: string
    imageUrl: string
    imageAlt: string
    formTitle: string
    formSubtitle: string
    cityOptions: string[]
    successTitle: string
    successText: string
    experienceValue: string
    experienceLabel: string
  }
  services: {
    heading: string
    subtext: string
    ctaLabel: string
    ctaHref: string
    maxItems: number
  }
  about: {
    title: string
    description1: string
    description2: string
    imageUrl: string
    imageAlt: string
    imageTitle: string
    highlights: Pair[]
    stats: Stat[]
    howItWorksHeading: string
  }
  cityCoverage: {
    heading: string
    subtext: string
    expansionText: string
  }
  blog: {
    heading: string
    subtext: string
    ctaLabel: string
  }
  contact: {
    heading: string
    subtext: string
    formTitle: string
    formSubtitle: string
    successText: string
    errorText: string
    cities: string[]
    trustBadges: string[]
  }
}

type SeoForm = {
  meta_title: string
  meta_description: string
  meta_keywords: string
  canonical_url: string
  og_image_url: string
  schema_json: string
  is_active: boolean
  is_indexed: boolean
}

type HomepageRow = {
  id?: number
  url_path: string
  page_type: string
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string | null
  canonical_url: string | null
  og_image_url: string | null
  page_data: Record<string, unknown> | null
  schema_json: unknown
  is_active: boolean | null
  is_indexed: boolean | null
  updated_at: string | null
}

type DbStats = {
  serviceCategories: number
  cityHubs: number
  brandReviews: number
  blogPosts: number
}

const DEFAULT_HOME_DATA: HomePageData = {
  hero: {
    badgeText: 'Bengaluru · 24/7 Doorstep Auto Service',
    heading: '24/7 Car & Bike Service at Your Doorstep',
    subheading: 'Book in seconds and get trusted car and bike repair, battery support, puncture repair and roadside assistance at your home, office or breakdown location.',
    features: [
      'Certified car and bike mechanics',
      'Transparent pricing before work starts',
      '30-day warranty on repairs',
      'Roadside assistance and doorstep support',
    ],
    avatars: ['RK', 'AM', 'SR', 'NV'],
    reviewText: 'Vehicle owners trust Fiixup for quick doorstep repair and roadside help',
    primaryCtaLabel: 'Book Service Now',
    primaryCtaHref: '/contact#contact-form',
    secondaryCtaLabel: 'Call Now',
    imageUrl: '/assets/Car_mechanic_700x1049.webp',
    imageAlt: 'Certified Fiixup mechanic providing doorstep car repair',
    formTitle: 'Book in 30 seconds. Mechanic at your doorstep in 30 minutes.',
    formSubtitle: 'Tell us your issue — our nearby mechanic team will contact you shortly',
    cityOptions: ['Bengaluru', 'Chennai', 'Hyderabad', 'Mumbai'],
    successTitle: 'Request Sent!',
    successText: 'Our team will call you shortly.',
    experienceValue: '20+',
    experienceLabel: 'Years Experience',
  },
  services: {
    heading: 'Professional Vehicle Services',
    subtext: 'Certified technicians at your doorstep for car repair, bike repair, battery, puncture, towing, inspection and roadside assistance.',
    ctaLabel: 'Browse All Services',
    ctaHref: '/services',
    maxItems: 8,
  },
  about: {
    title: 'Why Vehicle Owners Choose Fiixup',
    description1: 'Fiixup brings trusted car and bike repair support directly to your location, reducing garage visits and helping customers get fast help during breakdowns.',
    description2: 'Our team focuses on transparent pricing, trained technicians, genuine process, warranty-backed work and reliable support for everyday riders and drivers.',
    imageUrl: 'https://vpnztzzsyzgesnpihxsu.supabase.co/storage/v1/object/public/images/general/about-us-fiixup-1779454912831.webp',
    imageAlt: 'Fiixup doorstep mechanic repairing a vehicle',
    imageTitle: 'About Fiixup doorstep car and bike service',
    highlights: [
      { heading: 'Doorstep Convenience', text: 'Book service at home, office, apartment parking or roadside location.' },
      { heading: 'Transparent Pricing', text: 'Customers get clear pricing before work starts.' },
      { heading: 'Warranty Support', text: 'Selected repairs are covered with Fiixup warranty support.' },
    ],
    stats: [
      { value: '10,000+', label: 'Vehicles Serviced' },
      { value: '4.9/5', label: 'Average Rating' },
      { value: '30-Day', label: 'Warranty Support' },
      { value: '24/7', label: 'Booking Support' },
    ],
    howItWorksHeading: 'How Fiixup Works',
  },
  cityCoverage: {
    heading: 'Doorstep Car & Bike Mechanic Services Across Major Indian Cities',
    subtext: 'Book nearby car and bike mechanics for emergency breakdown help, battery replacement, puncture repair, oil change and roadside assistance.',
    expansionText: 'Expanding soon to more Indian cities',
  },
  blog: {
    heading: 'Latest from Our Blog',
    subtext: 'Expert tips, maintenance guides and service insights to help you keep your car and bike in better condition.',
    ctaLabel: 'View All Articles',
  },
  contact: {
    heading: 'Book a Nearby Car or Bike Mechanic at Your Location',
    subtext: 'Need help with a dead battery, puncture, engine issue, oil change, brake problem or vehicle not starting? Fiixup provides doorstep car and bike repair support at your location.',
    formTitle: 'Request Doorstep Repair or Vehicle Service',
    formSubtitle: 'Share your vehicle issue and our nearby mechanic team will contact you shortly.',
    successText: '✅ Booking request received successfully. Our team will contact you shortly.',
    errorText: '❌ Unable to send your request right now. Please call us directly.',
    cities: ['Bengaluru', 'Chennai', 'Hyderabad', 'Mumbai'],
    trustBadges: [
      '✅ Technician arrives quickly',
      '✅ Upfront pricing — no hidden charges',
      '✅ 30-day warranty on selected repairs',
      '✅ Certified & background-verified technicians',
    ],
  },
}

const DEFAULT_SEO: SeoForm = {
  meta_title: 'Fiixup — 24/7 Doorstep Car & Bike Repair in India',
  meta_description: 'Book trusted doorstep car and bike repair, battery support, puncture repair and roadside assistance with Fiixup.',
  meta_keywords: 'doorstep car repair, bike repair at home, mobile mechanic, roadside assistance, Fiixup',
  canonical_url: 'https://fiixup.in/',
  og_image_url: 'https://fiixup.in/assets/og-image.webp',
  schema_json: '{}',
  is_active: true,
  is_indexed: true,
}

const EMPTY_STATS: DbStats = {
  serviceCategories: 0,
  cityHubs: 0,
  brandReviews: 0,
  blogPosts: 0,
}

function objectValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

function stringValue(value: unknown, fallback = '') {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return [...fallback]
  const rows = value.map((item) => stringValue(item).trim()).filter(Boolean)
  return rows.length ? rows : [...fallback]
}

function pairArray(value: unknown, fallback: Pair[]) {
  if (!Array.isArray(value)) return [...fallback]
  const rows = value
    .map((item) => objectValue(item))
    .map((item) => ({ heading: stringValue(item.heading ?? item.title).trim(), text: stringValue(item.text ?? item.description).trim() }))
    .filter((item) => item.heading || item.text)
  return rows.length ? rows : [...fallback]
}

function statArray(value: unknown, fallback: Stat[]) {
  if (!Array.isArray(value)) return [...fallback]
  const rows = value
    .map((item) => objectValue(item))
    .map((item) => ({ value: stringValue(item.value).trim(), label: stringValue(item.label).trim() }))
    .filter((item) => item.value || item.label)
  return rows.length ? rows : [...fallback]
}

function mergeHomeData(value: unknown): HomePageData {
  const pd = objectValue(value)
  const hero = objectValue(pd.hero)
  const services = objectValue(pd.services)
  const about = objectValue(pd.about)
  const cityCoverage = objectValue(pd.cityCoverage)
  const blog = objectValue(pd.blog)
  const contact = objectValue(pd.contact)

  return {
    hero: {
      badgeText: stringValue(hero.badgeText, DEFAULT_HOME_DATA.hero.badgeText),
      heading: stringValue(hero.heading, DEFAULT_HOME_DATA.hero.heading),
      subheading: stringValue(hero.subheading, DEFAULT_HOME_DATA.hero.subheading),
      features: stringArray(hero.features, DEFAULT_HOME_DATA.hero.features),
      avatars: stringArray(hero.avatars, DEFAULT_HOME_DATA.hero.avatars),
      reviewText: stringValue(hero.reviewText, DEFAULT_HOME_DATA.hero.reviewText),
      primaryCtaLabel: stringValue(hero.primaryCtaLabel, DEFAULT_HOME_DATA.hero.primaryCtaLabel),
      primaryCtaHref: stringValue(hero.primaryCtaHref, DEFAULT_HOME_DATA.hero.primaryCtaHref),
      secondaryCtaLabel: stringValue(hero.secondaryCtaLabel, DEFAULT_HOME_DATA.hero.secondaryCtaLabel),
      imageUrl: stringValue(hero.imageUrl, DEFAULT_HOME_DATA.hero.imageUrl),
      imageAlt: stringValue(hero.imageAlt, DEFAULT_HOME_DATA.hero.imageAlt),
      formTitle: stringValue(hero.formTitle, DEFAULT_HOME_DATA.hero.formTitle),
      formSubtitle: stringValue(hero.formSubtitle, DEFAULT_HOME_DATA.hero.formSubtitle),
      cityOptions: stringArray(hero.cityOptions, DEFAULT_HOME_DATA.hero.cityOptions),
      successTitle: stringValue(hero.successTitle, DEFAULT_HOME_DATA.hero.successTitle),
      successText: stringValue(hero.successText, DEFAULT_HOME_DATA.hero.successText),
      experienceValue: stringValue(hero.experienceValue, DEFAULT_HOME_DATA.hero.experienceValue),
      experienceLabel: stringValue(hero.experienceLabel, DEFAULT_HOME_DATA.hero.experienceLabel),
    },
    services: {
      heading: stringValue(services.heading, DEFAULT_HOME_DATA.services.heading),
      subtext: stringValue(services.subtext, DEFAULT_HOME_DATA.services.subtext),
      ctaLabel: stringValue(services.ctaLabel, DEFAULT_HOME_DATA.services.ctaLabel),
      ctaHref: stringValue(services.ctaHref, DEFAULT_HOME_DATA.services.ctaHref),
      maxItems: numberValue(services.maxItems, DEFAULT_HOME_DATA.services.maxItems),
    },
    about: {
      title: stringValue(about.title, DEFAULT_HOME_DATA.about.title),
      description1: stringValue(about.description1, DEFAULT_HOME_DATA.about.description1),
      description2: stringValue(about.description2, DEFAULT_HOME_DATA.about.description2),
      imageUrl: stringValue(about.imageUrl, DEFAULT_HOME_DATA.about.imageUrl),
      imageAlt: stringValue(about.imageAlt, DEFAULT_HOME_DATA.about.imageAlt),
      imageTitle: stringValue(about.imageTitle, DEFAULT_HOME_DATA.about.imageTitle),
      highlights: pairArray(about.highlights, DEFAULT_HOME_DATA.about.highlights),
      stats: statArray(about.stats, DEFAULT_HOME_DATA.about.stats),
      howItWorksHeading: stringValue(about.howItWorksHeading, DEFAULT_HOME_DATA.about.howItWorksHeading),
    },
    cityCoverage: {
      heading: stringValue(cityCoverage.heading, DEFAULT_HOME_DATA.cityCoverage.heading),
      subtext: stringValue(cityCoverage.subtext, DEFAULT_HOME_DATA.cityCoverage.subtext),
      expansionText: stringValue(cityCoverage.expansionText, DEFAULT_HOME_DATA.cityCoverage.expansionText),
    },
    blog: {
      heading: stringValue(blog.heading, DEFAULT_HOME_DATA.blog.heading),
      subtext: stringValue(blog.subtext, DEFAULT_HOME_DATA.blog.subtext),
      ctaLabel: stringValue(blog.ctaLabel, DEFAULT_HOME_DATA.blog.ctaLabel),
    },
    contact: {
      heading: stringValue(contact.heading, DEFAULT_HOME_DATA.contact.heading),
      subtext: stringValue(contact.subtext, DEFAULT_HOME_DATA.contact.subtext),
      formTitle: stringValue(contact.formTitle, DEFAULT_HOME_DATA.contact.formTitle),
      formSubtitle: stringValue(contact.formSubtitle, DEFAULT_HOME_DATA.contact.formSubtitle),
      successText: stringValue(contact.successText, DEFAULT_HOME_DATA.contact.successText),
      errorText: stringValue(contact.errorText, DEFAULT_HOME_DATA.contact.errorText),
      cities: stringArray(contact.cities, DEFAULT_HOME_DATA.contact.cities),
      trustBadges: stringArray(contact.trustBadges, DEFAULT_HOME_DATA.contact.trustBadges),
    },
  }
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return '{}'
  }
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function Field({ label, value, onChange, placeholder, help }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; help?: string }) {
  return (
    <label className="space-y-1">
      <span className="admin-label">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="admin-input" />
      {help && <p className="text-xs text-[#6b7280] leading-relaxed">{help}</p>}
    </label>
  )
}

function TextArea({ label, value, onChange, rows = 3, help }: { label: string; value: string; onChange: (value: string) => void; rows?: number; help?: string }) {
  return (
    <label className="space-y-1">
      <span className="admin-label">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="admin-input resize-y" />
      {help && <p className="text-xs text-[#6b7280] leading-relaxed">{help}</p>}
    </label>
  )
}

function ArrayEditor({ label, values, onChange, placeholder, help }: { label: string; values: string[]; onChange: (values: string[]) => void; placeholder?: string; help?: string }) {
  const text = values.join('\n')
  return (
    <TextArea
      label={label}
      value={text}
      onChange={(next) => onChange(next.split('\n').map((item) => item.trim()).filter(Boolean))}
      rows={5}
      help={help || placeholder || 'One item per line.'}
    />
  )
}

function PairEditor({ label, rows, onChange, help }: { label: string; rows: Pair[]; onChange: (rows: Pair[]) => void; help?: string }) {
  const text = rows.map((row) => `${row.heading} | ${row.text}`).join('\n')
  return (
    <TextArea
      label={label}
      value={text}
      onChange={(next) => onChange(next.split('\n').map((line) => {
        const [heading = '', ...rest] = line.split('|')
        return { heading: heading.trim(), text: rest.join('|').trim() }
      }).filter((row) => row.heading || row.text))}
      rows={6}
      help={help || 'Format: Heading | Description. One row per line.'}
    />
  )
}

function StatEditor({ label, rows, onChange }: { label: string; rows: Stat[]; onChange: (rows: Stat[]) => void }) {
  const text = rows.map((row) => `${row.value} | ${row.label}`).join('\n')
  return (
    <TextArea
      label={label}
      value={text}
      onChange={(next) => onChange(next.split('\n').map((line) => {
        const [value = '', ...rest] = line.split('|')
        return { value: value.trim(), label: rest.join('|').trim() }
      }).filter((row) => row.value || row.label))}
      rows={5}
      help="Format: Value | Label. Example: 30-Day | Warranty Support"
    />
  )
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  icon: ElementType
  children: ReactNode
}) {
  return (
    <section className="admin-card p-5 space-y-4">
      <div className="flex items-start gap-3 border-b border-[#2a2d3e] pb-4">
        <div className="bg-blue-500/10 p-2 rounded-xl flex-shrink-0">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold">{title}</h2>
          <p className="text-xs text-[#6b7280] mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export default function HomepageEditorPage() {
  const sb = getBrowserClient()
  const [seo, setSeo] = useState<SeoForm>(DEFAULT_SEO)
  const [homeData, setHomeData] = useState<HomePageData>(DEFAULT_HOME_DATA)
  const [dbStats, setDbStats] = useState<DbStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const previewJson = useMemo(() => safeJson(homeData), [homeData])

  const fetchHomepage = useCallback(async () => {
    setLoading(true)

    const [homeResult, serviceResult, cityResult, reviewResult, postResult] = await Promise.all([
      sb
        .from('seo_pages')
        .select('id,url_path,page_type,meta_title,meta_description,meta_keywords,canonical_url,og_image_url,page_data,schema_json,is_active,is_indexed,updated_at')
        .eq('url_path', '/')
        .maybeSingle(),
      sb.from('service_categories').select('id', { count: 'exact', head: true }),
      sb.from('seo_pages').select('id', { count: 'exact', head: true }).eq('page_type', 'city_hub').eq('is_active', true),
      sb.from('review_sources').select('id', { count: 'exact', head: true }),
      sb.from('posts').select('id', { count: 'exact', head: true }),
    ])

    setLoading(false)

    if (homeResult.error) {
      showToast('error', homeResult.error.message)
      return
    }

    const row = (homeResult.data ?? null) as unknown as HomepageRow | null
    setSeo({
      meta_title: stringValue(row?.meta_title, DEFAULT_SEO.meta_title),
      meta_description: stringValue(row?.meta_description, DEFAULT_SEO.meta_description),
      meta_keywords: stringValue(row?.meta_keywords, DEFAULT_SEO.meta_keywords),
      canonical_url: stringValue(row?.canonical_url, DEFAULT_SEO.canonical_url),
      og_image_url: stringValue(row?.og_image_url, DEFAULT_SEO.og_image_url),
      schema_json: safeJson(row?.schema_json ?? {}),
      is_active: row?.is_active !== false,
      is_indexed: row?.is_indexed !== false,
    })
    setHomeData(mergeHomeData(row?.page_data))
    setDbStats({
      serviceCategories: serviceResult.count ?? 0,
      cityHubs: cityResult.count ?? 0,
      brandReviews: reviewResult.count ?? 0,
      blogPosts: postResult.count ?? 0,
    })
  }, [sb])

  useEffect(() => {
    fetchHomepage()
  }, [fetchHomepage])

  const updateHero = (next: Partial<HomePageData['hero']>) => setHomeData((current) => ({ ...current, hero: { ...current.hero, ...next } }))
  const updateServices = (next: Partial<HomePageData['services']>) => setHomeData((current) => ({ ...current, services: { ...current.services, ...next } }))
  const updateAbout = (next: Partial<HomePageData['about']>) => setHomeData((current) => ({ ...current, about: { ...current.about, ...next } }))
  const updateCoverage = (next: Partial<HomePageData['cityCoverage']>) => setHomeData((current) => ({ ...current, cityCoverage: { ...current.cityCoverage, ...next } }))
  const updateBlog = (next: Partial<HomePageData['blog']>) => setHomeData((current) => ({ ...current, blog: { ...current.blog, ...next } }))
  const updateContact = (next: Partial<HomePageData['contact']>) => setHomeData((current) => ({ ...current, contact: { ...current.contact, ...next } }))

  const saveHomepage = async () => {
    const schemaJson = parseJsonObject(seo.schema_json)
    if (!schemaJson) {
      showToast('error', 'schema_json invalid hai. Please valid JSON rakho.')
      return
    }

    setSaving(true)
    const payload = {
      url_path: '/',
      page_type: 'home',
      meta_title: seo.meta_title.trim(),
      meta_description: seo.meta_description.trim(),
      meta_keywords: seo.meta_keywords.trim(),
      canonical_url: seo.canonical_url.trim() || 'https://fiixup.in/',
      og_image_url: seo.og_image_url.trim() || null,
      schema_json: schemaJson,
      page_data: homeData,
      is_active: seo.is_active,
      is_indexed: seo.is_indexed,
      updated_at: new Date().toISOString(),
    }

    const { error } = await sb.from('seo_pages').upsert(payload, { onConflict: 'url_path' })
    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateSeoPages()
    showToast('success', revalidate.success ? 'Homepage saved and live cache cleared.' : 'Homepage saved. Live site may update within 1 hour.')
    fetchHomepage()
  }

  if (loading) {
    return (
      <div className="admin-card p-8 text-center text-[#94a3b8]">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
        Loading full homepage editor...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
<Database className="w-6 h-6 text-blue-400" />            Full Homepage Editor
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Full control for seo_pages homepage content. Service cards, city cards, blog posts and reviews still come from their master DB tables.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={fetchHomepage} className="admin-btn-secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button type="button" onClick={saveHomepage} disabled={saving} className="admin-btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Homepage
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="admin-card p-4 text-center"><Database className="w-5 h-5 text-blue-400 mx-auto mb-2" /><p className="text-2xl font-extrabold text-white">{dbStats.serviceCategories}</p><p className="text-xs text-[#6b7280]">Service category cards</p></div>
        <div className="admin-card p-4 text-center"><MapPin className="w-5 h-5 text-green-400 mx-auto mb-2" /><p className="text-2xl font-extrabold text-white">{dbStats.cityHubs}</p><p className="text-xs text-[#6b7280]">City coverage cards</p></div>
        <div className="admin-card p-4 text-center"><Star className="w-5 h-5 text-yellow-400 mx-auto mb-2" /><p className="text-2xl font-extrabold text-white">{dbStats.brandReviews}</p><p className="text-xs text-[#6b7280]">Review sources</p></div>
        <div className="admin-card p-4 text-center"><FileText className="w-5 h-5 text-purple-400 mx-auto mb-2" /><p className="text-2xl font-extrabold text-white">{dbStats.blogPosts}</p><p className="text-xs text-[#6b7280]">Blog posts</p></div>
      </div>

      <SectionCard title="SEO + Schema" description="Controls Next.js metadata and homepage JSON-LD schema from seo_pages." icon={Settings}>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Meta Title" value={seo.meta_title} onChange={(value) => setSeo({ ...seo, meta_title: value })} />
          <Field label="Canonical URL" value={seo.canonical_url} onChange={(value) => setSeo({ ...seo, canonical_url: value })} />
          <TextArea label="Meta Description" value={seo.meta_description} onChange={(value) => setSeo({ ...seo, meta_description: value })} rows={3} />
          <TextArea label="Meta Keywords" value={seo.meta_keywords} onChange={(value) => setSeo({ ...seo, meta_keywords: value })} rows={3} />
          <Field label="OG Image URL" value={seo.og_image_url} onChange={(value) => setSeo({ ...seo, og_image_url: value })} />
          <div className="flex flex-wrap gap-4 pt-6">
            <label className="flex items-center gap-2 text-sm text-[#cbd5e1]"><input type="checkbox" checked={seo.is_active} onChange={(event) => setSeo({ ...seo, is_active: event.target.checked })} /> Active</label>
            <label className="flex items-center gap-2 text-sm text-[#cbd5e1]"><input type="checkbox" checked={seo.is_indexed} onChange={(event) => setSeo({ ...seo, is_indexed: event.target.checked })} /> Indexed</label>
          </div>
          <div className="md:col-span-2"><TextArea label="schema_json" value={seo.schema_json} onChange={(value) => setSeo({ ...seo, schema_json: value })} rows={8} help="Valid JSON object only. For multiple schema objects, use @graph inside this object." /></div>
        </div>
      </SectionCard>

      <SectionCard title="Hero Section" description="Controls heading, form title/subtitle, CTA, image, trust points and success message used in the top hero." icon={Star}>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Badge Text" value={homeData.hero.badgeText} onChange={(value) => updateHero({ badgeText: value })} />
          <Field label="Heading / H1" value={homeData.hero.heading} onChange={(value) => updateHero({ heading: value })} />
          <div className="md:col-span-2"><TextArea label="Subheading" value={homeData.hero.subheading} onChange={(value) => updateHero({ subheading: value })} rows={3} /></div>
          <ArrayEditor label="Hero Feature Points" values={homeData.hero.features} onChange={(values) => updateHero({ features: values })} />
          <ArrayEditor label="Avatar Initials" values={homeData.hero.avatars} onChange={(values) => updateHero({ avatars: values })} help="Small customer initials shown near star rating. One per line." />
          <div className="md:col-span-2"><TextArea label="Review Text" value={homeData.hero.reviewText} onChange={(value) => updateHero({ reviewText: value })} rows={2} /></div>
          <Field label="Primary CTA Label" value={homeData.hero.primaryCtaLabel} onChange={(value) => updateHero({ primaryCtaLabel: value })} />
          <Field label="Primary CTA URL" value={homeData.hero.primaryCtaHref} onChange={(value) => updateHero({ primaryCtaHref: value })} />
          <Field label="Secondary CTA Label" value={homeData.hero.secondaryCtaLabel} onChange={(value) => updateHero({ secondaryCtaLabel: value })} />
          <Field label="Hero Image URL" value={homeData.hero.imageUrl} onChange={(value) => updateHero({ imageUrl: value })} />
          <Field label="Hero Image Alt" value={homeData.hero.imageAlt} onChange={(value) => updateHero({ imageAlt: value })} />
          <Field label="Experience Value" value={homeData.hero.experienceValue} onChange={(value) => updateHero({ experienceValue: value })} />
          <Field label="Experience Label" value={homeData.hero.experienceLabel} onChange={(value) => updateHero({ experienceLabel: value })} />
          <Field label="Hero Form Title" value={homeData.hero.formTitle} onChange={(value) => updateHero({ formTitle: value })} />
          <Field label="Hero Form Subtitle" value={homeData.hero.formSubtitle} onChange={(value) => updateHero({ formSubtitle: value })} />
          <ArrayEditor label="Hero City Dropdown Options" values={homeData.hero.cityOptions} onChange={(values) => updateHero({ cityOptions: values })} />
          <Field label="Success Title" value={homeData.hero.successTitle} onChange={(value) => updateHero({ successTitle: value })} />
          <div className="md:col-span-2"><TextArea label="Success Text" value={homeData.hero.successText} onChange={(value) => updateHero({ successText: value })} rows={2} /></div>
        </div>
      </SectionCard>

      <SectionCard title="Services Section" description="Controls section text and max items. Actual cards come from service_categories master table." icon={Database}>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Heading" value={homeData.services.heading} onChange={(value) => updateServices({ heading: value })} />
          <Field label="CTA Label" value={homeData.services.ctaLabel} onChange={(value) => updateServices({ ctaLabel: value })} />
          <Field label="CTA URL" value={homeData.services.ctaHref} onChange={(value) => updateServices({ ctaHref: value })} />
          <Field label="Max Cards" value={String(homeData.services.maxItems)} onChange={(value) => updateServices({ maxItems: Number(value) || 8 })} />
          <div className="md:col-span-2"><TextArea label="Subtext" value={homeData.services.subtext} onChange={(value) => updateServices({ subtext: value })} rows={3} /></div>
        </div>
      </SectionCard>

      <SectionCard title="About Section" description="Controls about heading, paragraphs, image, highlights, stats and how-it-works heading." icon={ImageIcon}>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Title" value={homeData.about.title} onChange={(value) => updateAbout({ title: value })} />
          <Field label="Image URL" value={homeData.about.imageUrl} onChange={(value) => updateAbout({ imageUrl: value })} />
          <Field label="Image Alt" value={homeData.about.imageAlt} onChange={(value) => updateAbout({ imageAlt: value })} />
          <Field label="Image Title" value={homeData.about.imageTitle} onChange={(value) => updateAbout({ imageTitle: value })} />
          <div className="md:col-span-2"><TextArea label="Description 1" value={homeData.about.description1} onChange={(value) => updateAbout({ description1: value })} rows={4} /></div>
          <div className="md:col-span-2"><TextArea label="Description 2" value={homeData.about.description2} onChange={(value) => updateAbout({ description2: value })} rows={4} /></div>
          <PairEditor label="Highlights" rows={homeData.about.highlights} onChange={(rows) => updateAbout({ highlights: rows })} />
          <StatEditor label="Stats" rows={homeData.about.stats} onChange={(rows) => updateAbout({ stats: rows })} />
          <div className="md:col-span-2"><Field label="How It Works Heading" value={homeData.about.howItWorksHeading} onChange={(value) => updateAbout({ howItWorksHeading: value })} /></div>
        </div>
      </SectionCard>

      <SectionCard title="City Coverage Section" description="Controls text only. City cards are auto-fetched from active city_hub seo_pages, so update city pages to control cards." icon={MapPin}>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Heading" value={homeData.cityCoverage.heading} onChange={(value) => updateCoverage({ heading: value })} />
          <Field label="Expansion Text" value={homeData.cityCoverage.expansionText} onChange={(value) => updateCoverage({ expansionText: value })} />
          <div className="md:col-span-2"><TextArea label="Subtext" value={homeData.cityCoverage.subtext} onChange={(value) => updateCoverage({ subtext: value })} rows={4} /></div>
        </div>
      </SectionCard>

      <SectionCard title="Testimonials + Blog" description="Controls testimonial heading is currently hard-coded in frontend; blog section text is controlled here. Reviews come from review_sources; posts come from posts." icon={Star}>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Blog Heading" value={homeData.blog.heading} onChange={(value) => updateBlog({ heading: value })} />
          <Field label="Blog CTA Label" value={homeData.blog.ctaLabel} onChange={(value) => updateBlog({ ctaLabel: value })} />
          <div className="md:col-span-2"><TextArea label="Blog Subtext" value={homeData.blog.subtext} onChange={(value) => updateBlog({ subtext: value })} rows={3} /></div>
        </div>
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-100">
          For full testimonial title/subtitle control, frontend Testimonials component needs to accept homepage data. Current testimonials are correctly fetched from review_sources.
        </div>
      </SectionCard>

      <SectionCard title="Contact Section" description="Controls bottom contact heading, form title/subtitle, cities and trust badges. Phone/email come from Site Settings." icon={Phone}>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Heading" value={homeData.contact.heading} onChange={(value) => updateContact({ heading: value })} />
          <Field label="Form Title" value={homeData.contact.formTitle} onChange={(value) => updateContact({ formTitle: value })} />
          <div className="md:col-span-2"><TextArea label="Subtext" value={homeData.contact.subtext} onChange={(value) => updateContact({ subtext: value })} rows={4} /></div>
          <div className="md:col-span-2"><TextArea label="Form Subtitle" value={homeData.contact.formSubtitle} onChange={(value) => updateContact({ formSubtitle: value })} rows={2} /></div>
          <TextArea label="Success Text" value={homeData.contact.successText} onChange={(value) => updateContact({ successText: value })} rows={3} />
          <TextArea label="Error Text" value={homeData.contact.errorText} onChange={(value) => updateContact({ errorText: value })} rows={3} />
          <ArrayEditor label="Contact Cities" values={homeData.contact.cities} onChange={(values) => updateContact({ cities: values })} />
          <ArrayEditor label="Trust Badges" values={homeData.contact.trustBadges} onChange={(values) => updateContact({ trustBadges: values })} />
        </div>
      </SectionCard>

      <SectionCard title="Generated page_data Preview" description="Read-only preview of the JSON that will be saved to seo_pages.page_data." icon={FileText}>
        <textarea value={previewJson} readOnly rows={18} className="admin-input font-mono text-xs resize-y" />
      </SectionCard>
    </div>
  )
}
