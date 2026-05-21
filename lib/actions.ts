'use server'
// lib/actions.ts
// All Server Actions — save to Supabase + trigger ISR revalidation on main site
// Called directly from Client Components via action={} or form actions

import { getServiceClient } from './supabase'
import { revalidatePath as nextRevalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActionResult =
  | { success: true;  message: string; error?: never  }
  | { success: false; error: string;   message?: never }
  | { success: boolean; message?: string; error?: string }

// ── ISR Revalidation ──────────────────────────────────────────────────────────
// Calls the main site's revalidation endpoint so live pages update immediately

async function revalidateMainSite(paths: string[]) {
  const secret = process.env.REVALIDATE_SECRET
  const siteUrl = process.env.MAIN_SITE_URL ?? 'https://fiixup.in'
  if (!secret) return

  await Promise.allSettled(
    paths.map((path) =>
      fetch(`${siteUrl}/api/revalidate?secret=${secret}&path=${encodeURIComponent(path)}`, {
        method: 'POST',
        cache:  'no-store',
      })
    )
  )
}

// ── CITIES ────────────────────────────────────────────────────────────────────

export async function saveCity(
  cityId: string,
  citySlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('cities')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', cityId)

  if (error) return { success: false, error: error.message }

  await revalidateMainSite([`/${citySlug}`, '/'])
  return { success: true, message: `${citySlug} saved and live site updated.` }
}

export async function saveCityTestimonial(
  testimonialId: string,
  citySlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('city_testimonials')
    .update(data)
    .eq('id', testimonialId)

  if (error) return { success: false, error: error.message }
  await revalidateMainSite([`/${citySlug}`])
  return { success: true, message: 'Testimonial saved.' }
}

export async function addCityTestimonial(
  cityId: string,
  citySlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('city_testimonials')
    .insert({ ...data, city_id: cityId, source: 'manual', verified: true })

  if (error) return { success: false, error: error.message }
  await revalidateMainSite([`/${citySlug}`])
  return { success: true, message: 'Testimonial added.' }
}

export async function deleteCityTestimonial(
  testimonialId: string,
  citySlug: string
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('city_testimonials')
    .delete()
    .eq('id', testimonialId)

  if (error) return { success: false, error: error.message }
  await revalidateMainSite([`/${citySlug}`])
  return { success: true, message: 'Testimonial deleted.' }
}

export async function saveCityFaq(
  faqId: string,
  citySlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('city_faqs')
    .update(data)
    .eq('id', faqId)

  if (error) return { success: false, error: error.message }
  await revalidateMainSite([`/${citySlug}`])
  return { success: true, message: 'FAQ saved.' }
}

export async function addCityFaq(
  cityId: string,
  citySlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('city_faqs')
    .insert({ ...data, city_id: cityId })

  if (error) return { success: false, error: error.message }
  await revalidateMainSite([`/${citySlug}`])
  return { success: true, message: 'FAQ added.' }
}

export async function deleteCityFaq(
  faqId: string,
  citySlug: string
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb.from('city_faqs').delete().eq('id', faqId)
  if (error) return { success: false, error: error.message }
  await revalidateMainSite([`/${citySlug}`])
  return { success: true, message: 'FAQ deleted.' }
}

// ── LOCATION SERVICES ─────────────────────────────────────────────────────────

export async function saveLocationService(
  lsId: number,
  citySlug: string,
  serviceSlug: string,
  areaSlug: string | null,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('location_services')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', lsId)

  if (error) return { success: false, error: error.message }

  const paths = areaSlug
    ? [`/${citySlug}/${areaSlug}/${serviceSlug}`]
    : [`/${citySlug}/${serviceSlug}`]
  await revalidateMainSite(paths)
  return { success: true, message: 'Service saved and live site updated.' }
}

export async function saveLsPricingRow(
  rowId: string,
  lsId: number,
  citySlug: string,
  serviceSlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('ls_pricing_rows')
    .update(data)
    .eq('id', rowId)

  if (error) return { success: false, error: error.message }
  // Touch parent to trigger JSONB sync
  await sb.from('location_services').update({ updated_at: new Date().toISOString() }).eq('id', lsId)
  await revalidateMainSite([`/${citySlug}/${serviceSlug}`])
  return { success: true, message: 'Pricing row saved.' }
}

export async function addLsPricingRow(
  lsId: number,
  citySlug: string,
  serviceSlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('ls_pricing_rows')
    .insert({ ...data, location_service_id: lsId })

  if (error) return { success: false, error: error.message }
  await sb.from('location_services').update({ updated_at: new Date().toISOString() }).eq('id', lsId)
  await revalidateMainSite([`/${citySlug}/${serviceSlug}`])
  return { success: true, message: 'Pricing row added.' }
}

export async function deleteLsPricingRow(
  rowId: string,
  lsId: number,
  citySlug: string,
  serviceSlug: string
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb.from('ls_pricing_rows').delete().eq('id', rowId)
  if (error) return { success: false, error: error.message }
  await sb.from('location_services').update({ updated_at: new Date().toISOString() }).eq('id', lsId)
  await revalidateMainSite([`/${citySlug}/${serviceSlug}`])
  return { success: true, message: 'Pricing row deleted.' }
}

export async function saveLsTestimonial(
  testId: string,
  lsId: number,
  citySlug: string,
  serviceSlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb.from('ls_testimonials').update(data).eq('id', testId)
  if (error) return { success: false, error: error.message }
  await sb.from('location_services').update({ updated_at: new Date().toISOString() }).eq('id', lsId)
  await revalidateMainSite([`/${citySlug}/${serviceSlug}`])
  return { success: true, message: 'Testimonial saved.' }
}

export async function addLsTestimonial(
  lsId: number,
  citySlug: string,
  serviceSlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('ls_testimonials')
    .insert({ ...data, location_service_id: lsId, source: 'manual', verified: true })

  if (error) return { success: false, error: error.message }
  await sb.from('location_services').update({ updated_at: new Date().toISOString() }).eq('id', lsId)
  await revalidateMainSite([`/${citySlug}/${serviceSlug}`])
  return { success: true, message: 'Testimonial added.' }
}

export async function deleteLsTestimonial(
  testId: string,
  lsId: number,
  citySlug: string,
  serviceSlug: string
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb.from('ls_testimonials').delete().eq('id', testId)
  if (error) return { success: false, error: error.message }
  await sb.from('location_services').update({ updated_at: new Date().toISOString() }).eq('id', lsId)
  await revalidateMainSite([`/${citySlug}/${serviceSlug}`])
  return { success: true, message: 'Testimonial deleted.' }
}

export async function saveLsFaq(
  faqId: string,
  lsId: number,
  citySlug: string,
  serviceSlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb.from('ls_faqs').update(data).eq('id', faqId)
  if (error) return { success: false, error: error.message }
  await sb.from('location_services').update({ updated_at: new Date().toISOString() }).eq('id', lsId)
  await revalidateMainSite([`/${citySlug}/${serviceSlug}`])
  return { success: true, message: 'FAQ saved.' }
}

export async function addLsFaq(
  lsId: number,
  citySlug: string,
  serviceSlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('ls_faqs')
    .insert({ ...data, location_service_id: lsId })

  if (error) return { success: false, error: error.message }
  await sb.from('location_services').update({ updated_at: new Date().toISOString() }).eq('id', lsId)
  await revalidateMainSite([`/${citySlug}/${serviceSlug}`])
  return { success: true, message: 'FAQ added.' }
}

export async function deleteLsFaq(
  faqId: string,
  lsId: number,
  citySlug: string,
  serviceSlug: string
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb.from('ls_faqs').delete().eq('id', faqId)
  if (error) return { success: false, error: error.message }
  await sb.from('location_services').update({ updated_at: new Date().toISOString() }).eq('id', lsId)
  await revalidateMainSite([`/${citySlug}/${serviceSlug}`])
  return { success: true, message: 'FAQ deleted.' }
}

// ── CITY SERVICE PAGES ────────────────────────────────────────────────────────

export async function saveCityServicePage(
  cspId: string,
  citySlug: string,
  categorySlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('city_service_pages')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', cspId)

  if (error) return { success: false, error: error.message }
  await revalidateMainSite([`/${citySlug}/services/${categorySlug}`])
  return { success: true, message: 'Category page saved.' }
}

export async function saveCspPricingRow(
  rowId: string,
  cspId: string,
  citySlug: string,
  categorySlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb.from('csp_pricing_rows').update(data).eq('id', rowId)
  if (error) return { success: false, error: error.message }
  await sb.from('city_service_pages').update({ updated_at: new Date().toISOString() }).eq('id', cspId)
  await revalidateMainSite([`/${citySlug}/services/${categorySlug}`])
  return { success: true, message: 'Pricing row saved.' }
}

export async function addCspPricingRow(
  cspId: string,
  citySlug: string,
  categorySlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('csp_pricing_rows')
    .insert({ ...data, city_service_page_id: cspId })

  if (error) return { success: false, error: error.message }
  await sb.from('city_service_pages').update({ updated_at: new Date().toISOString() }).eq('id', cspId)
  await revalidateMainSite([`/${citySlug}/services/${categorySlug}`])
  return { success: true, message: 'Pricing row added.' }
}

export async function deleteCspPricingRow(
  rowId: string,
  cspId: string,
  citySlug: string,
  categorySlug: string
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb.from('csp_pricing_rows').delete().eq('id', rowId)
  if (error) return { success: false, error: error.message }
  await sb.from('city_service_pages').update({ updated_at: new Date().toISOString() }).eq('id', cspId)
  await revalidateMainSite([`/${citySlug}/services/${categorySlug}`])
  return { success: true, message: 'Pricing row deleted.' }
}

export async function saveCspFaq(
  faqId: string,
  cspId: string,
  citySlug: string,
  categorySlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb.from('csp_faqs').update(data).eq('id', faqId)
  if (error) return { success: false, error: error.message }
  await sb.from('city_service_pages').update({ updated_at: new Date().toISOString() }).eq('id', cspId)
  await revalidateMainSite([`/${citySlug}/services/${categorySlug}`])
  return { success: true, message: 'FAQ saved.' }
}

export async function addCspFaq(
  cspId: string,
  citySlug: string,
  categorySlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('csp_faqs')
    .insert({ ...data, city_service_page_id: cspId })

  if (error) return { success: false, error: error.message }
  await sb.from('city_service_pages').update({ updated_at: new Date().toISOString() }).eq('id', cspId)
  await revalidateMainSite([`/${citySlug}/services/${categorySlug}`])
  return { success: true, message: 'FAQ added.' }
}

export async function deleteCspFaq(
  faqId: string,
  cspId: string,
  citySlug: string,
  categorySlug: string
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb.from('csp_faqs').delete().eq('id', faqId)
  if (error) return { success: false, error: error.message }
  await sb.from('city_service_pages').update({ updated_at: new Date().toISOString() }).eq('id', cspId)
  await revalidateMainSite([`/${citySlug}/services/${categorySlug}`])
  return { success: true, message: 'FAQ deleted.' }
}

export async function saveCspTestimonial(
  testId: string,
  cspId: string,
  citySlug: string,
  categorySlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb.from('csp_testimonials').update(data).eq('id', testId)
  if (error) return { success: false, error: error.message }
  await sb.from('city_service_pages').update({ updated_at: new Date().toISOString() }).eq('id', cspId)
  await revalidateMainSite([`/${citySlug}/services/${categorySlug}`])
  return { success: true, message: 'Testimonial saved.' }
}

export async function addCspTestimonial(
  cspId: string,
  citySlug: string,
  categorySlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('csp_testimonials')
    .insert({ ...data, city_service_page_id: cspId, source: 'manual', verified: true })

  if (error) return { success: false, error: error.message }
  await sb.from('city_service_pages').update({ updated_at: new Date().toISOString() }).eq('id', cspId)
  await revalidateMainSite([`/${citySlug}/services/${categorySlug}`])
  return { success: true, message: 'Testimonial added.' }
}

export async function deleteCspTestimonial(
  testId: string,
  cspId: string,
  citySlug: string,
  categorySlug: string
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb.from('csp_testimonials').delete().eq('id', testId)
  if (error) return { success: false, error: error.message }
  await sb.from('city_service_pages').update({ updated_at: new Date().toISOString() }).eq('id', cspId)
  await revalidateMainSite([`/${citySlug}/services/${categorySlug}`])
  return { success: true, message: 'Testimonial deleted.' }
}

// ── POSTS ─────────────────────────────────────────────────────────────────────

export async function savePost(
  postId: string,
  postSlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('posts')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', postId)

  if (error) return { success: false, error: error.message }
  await revalidateMainSite([`/blog/${postSlug}`, '/blog'])
  return { success: true, message: 'Post saved and live site updated.' }
}

// ── SERVICES ──────────────────────────────────────────────────────────────────

export async function saveService(
  serviceId: string,
  serviceSlug: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const sb = getServiceClient()
  const { error } = await sb
    .from('services')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', serviceId)

  if (error) return { success: false, error: error.message }
  await revalidateMainSite([`/services/${serviceSlug}`, '/services'])
  return { success: true, message: 'Service saved.' }
}