'use client'
// app/(admin)/posts/[slug]/page.tsx
// Full Blog Post Editor — page orchestration only. UI sections live in components/posts/editor.

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { savePost } from '@/lib/actions'
import { DraftPreviewPanel } from '@/components/preview/DraftPreviewPanel'
import type { Block, SchemaType, Tab } from '@/components/posts/editor/types'
import { toBlocks, stripIds } from '@/utils/posts/blockUtils'
import {
  ContentTab,
  PostEditorBadges,
  PostEditorHeader,
  PostEditorTabs,
  SchemaTab,
  SeoTab,
  SettingsTab,
} from '@/components/posts/editor/PostEditorSections'
import { publicSiteUrl } from '@/lib/public-site'

export default function PostEditorPage() {
  const params = useParams()
  const postSlug = String(params.slug)

  const [post, setPost] = useState<Record<string, unknown> | null>(null)
  const [tab, setTab] = useState<Tab>('SEO')
  const [loading, setLoading] = useState(true)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [saving, setSaving] = useState(false)
  const [schemaType, setSchemaType] = useState<SchemaType>('BlogPosting')
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    const sb = getBrowserClient()
    const { data, error } = await sb.from('posts').select('*').eq('slug', postSlug).single()

    if (error) {
      showToast('error', error.message || 'Failed to load post')
      setPost(null)
      setLoading(false)
      return
    }

    if (data) {
      setPost(data)
      setBlocks(toBlocks(data.content))
      if (data.schema_type) setSchemaType(String(data.schema_type) as SchemaType)
      if (data.schema_overrides && typeof data.schema_overrides === 'object') {
        setOverrides(data.schema_overrides as Record<string, string>)
      }
    }

    setLoading(false)
  }, [postSlug])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  if (!post) return <div className="text-red-400 p-8">Post not found: {postSlug}</div>

  const save = (col: string) => async (val: unknown) => {
    const result = await savePost(String(post.id), postSlug, { [col]: val })
    if (!result.success) return result
    setPost((p) => (p ? { ...p, [col]: val } : p))
    showToast('success', result.message ?? 'Saved')
    return result
  }

  const savePatch = async (patch: Record<string, unknown>) => {
    const result = await savePost(String(post.id), postSlug, patch)
    if (!result.success) return result
    setPost((p) => (p ? { ...p, ...patch } : p))
    showToast('success', result.message ?? 'Saved')
    return result
  }

  const saveBool = async (col: string, val: boolean) => {
    const result = await savePost(String(post.id), postSlug, { [col]: val })
    if (!result.success) {
      showToast('error', result.error ?? 'Save failed')
      return
    }
    setPost((p) => (p ? { ...p, [col]: val } : p))
    showToast('success', result.message ?? 'Saved')
  }

  const saveBlocks = async (bl: Block[]) => {
    setSaving(true)
    const result = await savePost(String(post.id), postSlug, { content: stripIds(bl) })
    setSaving(false)

    if (result.success) {
      setBlocks(bl)
      setPost((p) => (p ? { ...p, content: stripIds(bl) } : p))
      showToast('success', 'Content saved')
    } else {
      showToast('error', result.error ?? 'Save failed')
    }
  }

  const saveSchema = async () => {
    const result = await savePost(String(post.id), postSlug, {
      schema_type: schemaType,
      schema_overrides: overrides,
    })

    if (result.success) showToast('success', 'Schema saved')
    else showToast('error', result.error ?? 'Save failed')
  }

  const liveUrl = publicSiteUrl(`/blog/${postSlug}`)
  const toggleFeatured = () => saveBool('featured', !Boolean(post.featured))

  return (
    <div className="space-y-6">
      <PostEditorHeader post={post} postSlug={postSlug} liveUrl={liveUrl} onRefresh={fetchData} />
      <PostEditorBadges post={post} schemaType={schemaType} blockCount={blocks.length} onToggleFeatured={toggleFeatured} />
      <PostEditorTabs tab={tab} setTab={setTab} />

      {tab === 'SEO' && <SeoTab post={post} postSlug={postSlug} save={save} />}

      {tab === 'Schema' && (
        <SchemaTab
          post={post}
          blocks={blocks}
          schemaType={schemaType}
          setSchemaType={setSchemaType}
          overrides={overrides}
          setOverrides={setOverrides}
          onSaveSchema={saveSchema}
          savePatch={savePatch}
        />
      )}

      {tab === 'Content' && (
        <ContentTab
          post={post}
          blocks={blocks}
          setBlocks={setBlocks}
          saving={saving}
          saveBlocks={saveBlocks}
          save={save}
        />
      )}

      {tab === 'Preview' && (
        <DraftPreviewPanel
          title={`Blog draft preview — ${String(post.title ?? postSlug)}`}
          contentType="post"
          sourceTable="posts"
          sourceId={String(post.id)}
          sourceSlug={postSlug}
          publicPath={`/blog/${postSlug}`}
          payload={{ ...post, content: stripIds(blocks) }}
          imageSettings={{}}
          onPublished={fetchData}
        />
      )}

      {tab === 'Settings' && <SettingsTab post={post} save={save} savePatch={savePatch} onToggleFeatured={toggleFeatured} />}
    </div>
  )
}
