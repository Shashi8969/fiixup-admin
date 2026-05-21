'use client'
// app/(admin)/posts/page.tsx

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase'
import { CreatePostModal } from '@/components/create/CreatePostModal'
import { FileText, Search, ArrowRight, Star, Plus, Loader2 } from 'lucide-react'

export default function PostsPage() {
  const sb = getBrowserClient()
  const [posts,      setPosts]      = useState<Record<string, unknown>[]>([])
  const [search,     setSearch]     = useState('')
  const [loading,    setLoading]    = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await sb.from('posts')
      .select('id,slug,title,category,featured,date,updated_at')
      .order('created_at', { ascending: false })
    setPosts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = posts.filter(p =>
    !search || String(p.title).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-400" />
            Blog Posts
          </h1>
          <p className="text-[#94a3b8] text-sm mt-1">{posts.length} posts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="admin-btn-primary">
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search posts…" className="admin-input pl-9" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <Link key={String(post.id)} href={`/posts/${post.slug}`}
              className="admin-card flex items-center gap-4 px-5 py-4 hover:border-[#3a3d4e] hover:bg-[#1e2133] transition-all group">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
                  {String(post.title ?? 'Untitled')}
                </p>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  {String(post.category ?? '—')} · {String(post.date ?? '')}
                </p>
              </div>
              {Boolean(post.featured) && (
                <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                  <Star className="w-3 h-3" /> Featured
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-[#6b7280] group-hover:text-white flex-shrink-0" />
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-[#6b7280]">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No posts found. Create your first post.</p>
            </div>
          )}
        </div>
      )}

      <CreatePostModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
    </div>
  )
}