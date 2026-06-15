'use client'

import { clsx } from 'clsx'
import { ArrowLeft, ExternalLink, FileText, Loader2, RefreshCw } from 'lucide-react'
import { Field } from '@/components/ui/Field'
import { AdminBackButton } from '@/components/navigation/AdminBackButton'
import { BlockEditor } from '@/components/posts/editor/BlockEditor'
import { PostAttachmentsEditor } from '@/components/posts/editor/BlogAttachmentEditors'
import { SchemaMultiSelector } from '@/components/schema/SchemaMultiSelector'
import { SeoMetaPanel } from '@/components/seo/SeoMetaPanel'
import type { SchemaEntityType } from '@/utils/schema/schemaTypes'
import { TABS, type Block, type SchemaType, type Tab } from '@/components/posts/editor/types'

type SaveFn = (col: string) => (val: unknown) => Promise<{ success: boolean; error?: string; message?: string }>
type SavePatchFn = (patch: Record<string, unknown>) => Promise<{ success: boolean; error?: string; message?: string }>

export function PostEditorHeader({ post, postSlug, liveUrl, onRefresh }: {
  post: Record<string, unknown>
  postSlug: string
  liveUrl: string
  onRefresh: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <AdminBackButton fallbackHref="/posts" className="p-2 rounded-lg hover:bg-[#2a2d3e] transition-colors text-[#6b7280]">
          <ArrowLeft className="w-5 h-5" />
        </AdminBackButton>
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            {String(post.title ?? 'Untitled Post')}
          </h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{postSlug} · {String(post.category ?? '—')}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={onRefresh} className="admin-btn-secondary">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
        <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary">
          <ExternalLink className="w-4 h-4" /> View Live
        </a>
      </div>
    </div>
  )
}

export function PostEditorBadges({ post, schemaType, blockCount, onToggleFeatured }: {
  post: Record<string, unknown>
  schemaType: SchemaType
  blockCount: number
  onToggleFeatured: () => void
}) {
  return (
    <div className="flex gap-2 items-center flex-wrap">
      <span className={clsx('text-xs font-semibold px-3 py-1 rounded-full border',
        post.featured ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-[#2a2d3e] text-[#6b7280] border-[#2a2d3e]'
      )}>
        {post.featured ? '⭐ Featured' : 'Not Featured'}
      </span>
      <button onClick={onToggleFeatured} className="text-xs text-[#6b7280] hover:text-white underline">
        Toggle
      </button>
      {schemaType !== 'none' && (
        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
          {schemaType}
        </span>
      )}
      <span className="text-xs text-[#6b7280] ml-auto">
        {blockCount} block{blockCount !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

export function PostEditorTabs({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  return (
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
  )
}

export function SeoTab({ post, postSlug, save }: {
  post: Record<string, unknown>
  postSlug: string
  save: SaveFn
}) {
  return (
    <div className="space-y-5">
      <SeoMetaPanel
        title={String(post.meta_title ?? '')}
        description={String(post.meta_description ?? '')}
        keywords={String(post.meta_keywords ?? '')}
        urlPath={`/blog/${postSlug}`}
        onSaveTitle={save('meta_title')}
        onSaveDescription={save('meta_description')}
        onSaveKeywords={save('meta_keywords')}
        extraFields={
          <>
            <Field label="Slug"    value={String(post.slug ?? '')}    onSave={save('slug')} />
            <Field label="Excerpt" value={String(post.excerpt ?? '')} onSave={save('excerpt')} multiline rows={3} />
          </>
        }
      />

      <div className="admin-card p-5 space-y-4">
        <h2 className="admin-section-title">Cover / OG Image</h2>
        <Field label="Image URL"      value={String(post.image     ?? '')} onSave={save('image')} />
        <Field label="Image Alt Text" value={String(post.image_alt ?? '')} onSave={save('image_alt')} />
        {String(post.image ?? '') && (
          <div className="rounded-xl overflow-hidden border border-[#2a2d3e] bg-[#0f1117]">
            <img src={String(post.image)} alt="OG preview" className="max-h-48 w-full object-cover" />
          </div>
        )}
      </div>
    </div>
  )
}

export function SchemaTab({ post, blocks, schemaType, setSchemaType, overrides, setOverrides, onSaveSchema, savePatch }: {
  post: Record<string, unknown>
  blocks: Block[]
  schemaType: SchemaType
  setSchemaType: (schemaType: SchemaType) => void
  overrides: Record<string, string>
  setOverrides: (overrides: Record<string, string>) => void
  onSaveSchema: () => void
  savePatch: SavePatchFn
}) {
  return (
    <div className="space-y-5">
      <SchemaMultiSelector
        kind="post"
        record={post}
        urlPath={`/blog/${String(post.slug ?? '')}`}
        blocks={blocks as unknown as Record<string, unknown>[]}
        selectedTypes={(Array.isArray(post.schema_types) ? post.schema_types : [schemaType].filter(Boolean)) as SchemaEntityType[]}
        overrides={overrides}
        onSave={async ({ schema_types, schema_overrides, schema_json }) => {
          setSchemaType((schema_types.find(t => ['BlogPosting','Article','FAQPage','HowTo'].includes(t)) ?? 'BlogPosting') as SchemaType)
          setOverrides(schema_overrides as Record<string, string>)
          return savePatch({ schema_types, schema_overrides, schema_json })
        }}
      />
    </div>
  )
}

export function ContentTab({ post, blocks, setBlocks, saving, saveBlocks, save }: {
  post: Record<string, unknown>
  blocks: Block[]
  setBlocks: (blocks: Block[]) => void
  saving: boolean
  saveBlocks: (blocks: Block[]) => void
  save: SaveFn
}) {
  return (
    <div className="space-y-5">
      <div className="admin-card p-5 space-y-4">
        <h2 className="admin-section-title">Post Info</h2>
        <Field label="Title"       value={String(post.title       ?? '')} onSave={save('title')} />
        <Field label="Author"      value={String(post.author      ?? '')} onSave={save('author')} />
        <Field label="Author Role" value={String(post.author_role ?? '')} onSave={save('author_role')} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date (display, e.g. January 15, 2025)" value={String(post.date      ?? '')} onSave={save('date')} />
          <Field label="Read Time (e.g. 5 min read)"           value={String(post.read_time ?? '')} onSave={save('read_time')} />
        </div>
        <Field label="Category" value={String(post.category ?? '')} onSave={save('category')} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-semibold text-[#e2e8f0]">Content Blocks</h2>
        <div className="flex gap-2">
          <button onClick={() => saveBlocks(blocks)} disabled={saving} className="admin-btn-primary text-xs">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Content
          </button>
        </div>
      </div>

      <BlockEditor blocks={blocks} onChange={setBlocks} />

      <div className="flex justify-end">
        <button onClick={() => saveBlocks(blocks)} disabled={saving} className="admin-btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save All Content
        </button>
      </div>
    </div>
  )
}

export function SettingsTab({ post, save, savePatch, onToggleFeatured }: {
  post: Record<string, unknown>
  save: SaveFn
  savePatch: SavePatchFn
  onToggleFeatured: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="admin-card p-6 space-y-5">
      <h2 className="admin-section-title">Post Settings</h2>

      <div className="flex items-center justify-between p-4 bg-[#1a1d27] rounded-xl border border-[#2a2d3e]">
        <div>
          <p className="text-sm font-semibold text-[#e2e8f0]">Featured Post</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Shown in featured sections across the site</p>
        </div>
        <button onClick={onToggleFeatured}
          className={clsx('relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
            post.featured ? 'bg-blue-600' : 'bg-[#2a2d3e]')}>
          <span className={clsx('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
            post.featured ? 'translate-x-6' : 'translate-x-1')} />
        </button>
      </div>

      <Field label="Related Service Slug"    value={String(post.related_service ?? '')} onSave={save('related_service')} />
      <Field label="Date ISO (for sorting)"  value={String(post.date_proper     ?? '')} onSave={save('date_proper')} />
      <Field label="Tags (comma separated)"
        value={Array.isArray(post.tags) ? (post.tags as string[]).join(', ') : String(post.tags ?? '')}
        onSave={async (val) => {
          const tags = val.split(',').map(t => t.trim()).filter(Boolean)
          return save('tags')(JSON.stringify(tags))
        }}
      />

      <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
        <p className="text-xs font-semibold text-red-400 mb-2">Danger Zone</p>
        <p className="text-xs text-[#6b7280]">
          To delete this post, use your Supabase dashboard. Deletion is disabled here to prevent accidents.
        </p>
      </div>
      </div>

      <PostAttachmentsEditor post={post} savePatch={savePatch} />
    </div>
  )
}
