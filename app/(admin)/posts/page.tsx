'use client'
// app/(admin)/posts/page.tsx

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase'
import { FileText, Search, ArrowRight, Star } from 'lucide-react'

export default function PostsPage() {
  const [posts,   setPosts]   = useState<Record<string, unknown>[]>([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const sb = getBrowserClient()
      const { data } = await sb
        .from('posts')
        .select('id, slug, title, category, featured, date, updated_at')
        .order('created_at', { ascending: false })
      setPosts(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = posts.filter((p) =>
    !search || String(p.title).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-green-400" />
          Blog Posts
        </h1>
        <p className="text-[#94a3b8] text-sm mt-1">Edit post titles, content, meta, categories.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search posts…" className="admin-input pl-9" />
      </div>

      {loading ? (
        <div className="text-center text-[#6b7280] py-12">Loading…</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((post) => (
            <Link key={String(post.id)} href={`/posts/${post.slug}`}
              className="admin-card flex items-center gap-4 px-5 py-4 hover:border-[#3a3d4e] hover:bg-[#1e2133] transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white group-hover:text-green-300 transition-colors truncate">
                  {String(post.title)}
                </p>
                <p className="text-sm text-[#6b7280] mt-0.5">
                  {String(post.category)} · {String(post.date)}
                </p>
              </div>
              {Boolean(post.featured) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center gap-1">
                  <Star className="w-3 h-3" /> Featured
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-[#6b7280] group-hover:text-white flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
