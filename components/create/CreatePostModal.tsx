'use client'
// components/create/CreatePostModal.tsx
// Create blog post — auto-slug from title, redirect to rich editor

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { CreateModal, CField, CSelect } from '@/components/ui/CreateModal'
import { Loader2 } from 'lucide-react'

const CATEGORIES = ['battery','maintenance','repair','tyres','roadside','buying-guide','how-to']
const AUTHORS    = ['Fiixup Team','Rishi Raj','Expert Mechanic','Fiixup Editorial']

interface Props { open: boolean; onClose: () => void; onCreated: () => void }

export function CreatePostModal({ open, onClose, onCreated }: Props) {
  const router = useRouter()
  const sb = getBrowserClient()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    title:'', slug:'', category:'', author:'Fiixup Team',
    excerpt:'', read_time:'5 min read', date_proper:'',
  })
  const f = (key: string) => (v: string) => setForm(p => ({ ...p, [key]: v }))

  const handleTitle = (v: string) => setForm(p => ({
    ...p, title: v,
    slug: v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
    meta_title: v,
  } as typeof p))

  const create = async () => {
    if (!form.title || !form.slug || !form.category) {
      showToast('error', 'Title, slug and category required'); return
    }
    setBusy(true)
    const { data, error } = await sb.from('posts').insert({
      title:       form.title,
      slug:        form.slug,
      category:    form.category,
      author:      form.author,
      excerpt:     form.excerpt,
      read_time:   form.read_time,
      date_proper: form.date_proper || new Date().toISOString().split('T')[0],
      date:        new Date().toLocaleDateString('en-US',{ month:'long', day:'numeric', year:'numeric' }),
      meta_title:  form.title,
      content:     [{ type: 'paragraph', content: 'Start writing your post here…' }],
      featured:    false,
    }).select('slug').single()
    setBusy(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Post created — opening editor')
    router.push(`/posts/${data.slug}`)
    onCreated(); onClose()
    setForm({ title:'',slug:'',category:'',author:'Fiixup Team',excerpt:'',read_time:'5 min read',date_proper:'' })
  }

  return (
    <CreateModal open={open} onClose={onClose} title="Create New Blog Post" subtitle="Auto-redirects to the rich editor after creation" width="lg">
      <div className="space-y-4">
        <CField label="Post Title" value={form.title} onChange={handleTitle}
          placeholder="How to Know When Your Car Battery Needs Replacement" required
          hint="Slug auto-generates from title" />
        <CField label="URL Slug" value={form.slug} onChange={f('slug')}
          placeholder="car-battery-replacement-signs" required
          hint={`fiixup.in/blog/${form.slug||'slug'}`} />
        <div className="grid grid-cols-2 gap-4">
          <CSelect label="Category" value={form.category} onChange={f('category')} required
            options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase()+c.slice(1).replace(/-/g,' ') }))} />
          <CSelect label="Author" value={form.author} onChange={f('author')}
            options={AUTHORS.map(a => ({ value: a, label: a }))} />
        </div>
        <CField label="Excerpt" value={form.excerpt} onChange={f('excerpt')}
          placeholder="A short summary shown in blog listing pages…" multiline rows={2} />
        <div className="grid grid-cols-2 gap-4">
          <CField label="Read Time" value={form.read_time} onChange={f('read_time')} placeholder="5 min read" />
          <CField label="Publish Date" value={form.date_proper} onChange={f('date_proper')} type="date" />
        </div>
        <button onClick={create} disabled={busy||!form.title||!form.slug||!form.category} className="admin-btn-primary w-full justify-center">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {busy ? 'Creating…' : 'Create Post & Open Editor →'}
        </button>
      </div>
    </CreateModal>
  )
}
