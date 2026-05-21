'use client'
// app/(admin)/posts/[slug]/page.tsx
// Full Blog Post editor — SEO | Content | Settings

import { useEffect, useState } from 'react'
import { useParams }           from 'next/navigation'
import Link                    from 'next/link'
import { getBrowserClient }    from '@/lib/supabase'
import { Field }               from '@/components/ui/Field'
import { showToast }           from '@/components/ui/Toast'
import { savePost }            from '@/lib/actions'
import {
  ArrowLeft, Globe, ExternalLink,
  Loader2, RefreshCw, FileText,
} from 'lucide-react'
import { clsx } from 'clsx'

const TABS = ['SEO', 'Content', 'Settings'] as const
type Tab = typeof TABS[number]

export default function PostEditorPage() {
  const params   = useParams()
  const postSlug = String(params.slug)

  const [post,    setPost]    = useState<Record<string, unknown> | null>(null)
  const [tab,     setTab]     = useState<Tab>('SEO')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const sb = getBrowserClient()
    const { data } = await sb.from('posts').select('*').eq('slug', postSlug).single()
    setPost(data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [postSlug])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )
  if (!post) return (
    <div className="text-red-400 p-8">Post not found: {postSlug}</div>
  )

  const save = (col: string) => async (val: string) => {
    const result = await savePost(String(post.id), postSlug, { [col]: val })
    if (!result.success) return result
    setPost((p) => p ? { ...p, [col]: val } : p)
    showToast('success', result.message)
    return result
  }

  const saveBool = async (col: string, val: boolean) => {
    const result = await savePost(String(post.id), postSlug, { [col]: val })
    if (!result.success) { showToast('error', result.error); return }
    setPost((p) => p ? { ...p, [col]: val } : p)
    showToast('success', result.message)
  }

  const liveUrl = `https://fiixup.in/blog/${postSlug}`

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/posts" className="p-2 rounded-lg hover:bg-[#2a2d3e] transition-colors text-[#6b7280]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="admin-page-title flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              {String(post.title ?? 'Untitled Post')}
            </h1>
            <p className="text-sm text-[#6b7280] mt-0.5">{postSlug} · {String(post.category ?? '—')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="admin-btn-secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary">
            <ExternalLink className="w-4 h-4" /> View Live
          </a>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex gap-2 flex-wrap">
        <span className={clsx(
          'text-xs font-semibold px-3 py-1 rounded-full border',
          post.featured
            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
            : 'bg-[#2a2d3e] text-[#6b7280] border-[#2a2d3e]'
        )}>
          {post.featured ? '⭐ Featured' : 'Not Featured'}
        </span>
        <button
          onClick={() => saveBool('featured', !post.featured)}
          className="text-xs text-[#6b7280] hover:text-white underline"
        >
          Toggle
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'tab-active' : 'tab-inactive'
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* ── SEO Tab ── */}
      {tab === 'SEO' && (
        <div className="admin-card p-6 space-y-5">
          <h2 className="admin-section-title">SEO Meta</h2>
          <Field label="Meta Title"       value={String(post.meta_title ?? '')}       onSave={save('meta_title')} />
          <Field label="Meta Description" value={String(post.meta_description ?? '')} onSave={save('meta_description')} multiline rows={3} />
          <Field label="Meta Keywords"    value={String(post.meta_keywords ?? '')}    onSave={save('meta_keywords')} multiline rows={2} />
          <Field label="Slug"             value={String(post.slug ?? '')}             onSave={save('slug')} />
          <Field label="OG Image URL"     value={String(post.image ?? '')}            onSave={save('image')} />
          <Field label="Image Alt Text"   value={String(post.image_alt ?? '')}        onSave={save('image_alt')} />
          <Field label="Excerpt"          value={String(post.excerpt ?? '')}          onSave={save('excerpt')} multiline rows={3} />
        </div>
      )}

      {/* ── Content Tab ── */}
      {tab === 'Content' && (
        <div className="admin-card p-6 space-y-5">
          <h2 className="admin-section-title">Post Content</h2>
          <Field label="Title"  value={String(post.title ?? '')}  onSave={save('title')} />
          <Field label="Author" value={String(post.author ?? '')} onSave={save('author')} />
          <Field label="Author Role" value={String(post.author_role ?? '')} onSave={save('author_role')} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date (e.g. January 15, 2025)" value={String(post.date ?? '')}      onSave={save('date')} />
            <Field label="Read Time (e.g. 5 min read)"  value={String(post.read_time ?? '')} onSave={save('read_time')} />
          </div>
          <Field label="Category" value={String(post.category ?? '')} onSave={save('category')} />

          <div className="pt-3 border-t border-[#2a2d3e]">
            <p className="text-xs text-[#6b7280] mb-3">
              Post content is stored as a JSON array of content blocks. Edit the raw JSON below.
              Each block has a <code className="text-blue-400">type</code> (e.g. paragraph, heading, image) and content.
            </p>
            <ContentJsonEditor
              value={post.content}
              onSave={save('content')}
            />
          </div>
        </div>
      )}

      {/* ── Settings Tab ── */}
      {tab === 'Settings' && (
        <div className="admin-card p-6 space-y-5">
          <h2 className="admin-section-title">Post Settings</h2>

          {/* Featured toggle */}
          <div className="flex items-center justify-between p-4 bg-[#1a1d27] rounded-xl border border-[#2a2d3e]">
            <div>
              <p className="text-sm font-semibold text-[#e2e8f0]">Featured Post</p>
              <p className="text-xs text-[#6b7280] mt-0.5">Shown in featured sections across the site</p>
            </div>
            <button
              onClick={() => saveBool('featured', !post.featured)}
              className={clsx(
                'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                post.featured ? 'bg-blue-600' : 'bg-[#2a2d3e]'
              )}
            >
              <span className={clsx(
                'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                post.featured ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          </div>

          <Field label="Related Service Slug" value={String(post.related_service ?? '')} onSave={save('related_service')} />
          <Field label="Date (ISO, for sorting)" value={String(post.date_proper ?? '')} onSave={save('date_proper')} />

          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
            <p className="text-xs font-semibold text-red-400 mb-2">Danger Zone</p>
            <p className="text-xs text-[#6b7280]">
              To delete this post, go to your Supabase dashboard. Deletion is not available from admin to prevent accidents.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Content JSON editor ──────────────────────────────────────────────────────
function ContentJsonEditor({
  value,
  onSave,
}: {
  value: unknown
  onSave: (val: string) => Promise<{ success: boolean; error?: string; message?: string }>
}) {
  const [text,   setText]   = useState(JSON.stringify(value ?? [], null, 2))
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handleSave = async () => {
    try { JSON.parse(text); setError('') }
    catch { setError('Invalid JSON — fix before saving.'); return }
    setSaving(true)
    const result = await onSave(text)
    setSaving(false)
    if (result.success) showToast('success', result.message ?? 'Saved')
    else setError(result.error ?? 'Save failed')
  }

  return (
    <div className="space-y-2">
      <label className="admin-label">Content Blocks (JSON)</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        className="admin-textarea font-mono text-xs"
        spellCheck={false}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button onClick={handleSave} disabled={saving} className="admin-btn-primary">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Save Content
      </button>
    </div>
  )
}
