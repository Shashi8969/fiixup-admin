'use client'

import type { Block } from '@/components/posts/editor/types'

const html = (value: unknown) => ({ __html: String(value ?? '') })

export function BlogPostLivePreview({ post, blocks }: { post: Record<string, unknown>; blocks: Block[] }) {
  return (
    <article className="admin-card overflow-hidden bg-white text-slate-900">
      {String(post.image ?? '') && (
        <img src={String(post.image)} alt={String(post.image_alt ?? post.title ?? '')} className="w-full max-h-[360px] object-cover" />
      )}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-blue-600">{String(post.category ?? 'Fiixup Blog')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-slate-950">{String(post.title ?? 'Untitled Post')}</h1>
          <p className="text-sm text-slate-500">
            {String(post.author ?? 'Fiixup Team')} {String(post.read_time ?? '') ? `· ${String(post.read_time)}` : ''}
          </p>
          {String(post.excerpt ?? '') && <p className="text-lg leading-relaxed text-slate-600">{String(post.excerpt)}</p>}
        </div>
        <div className="space-y-5 text-[16px] leading-8 text-slate-700">
          {blocks.map((block, index) => <PreviewBlock key={String(block._id ?? index)} block={block} />)}
        </div>
      </div>
    </article>
  )
}

function PreviewBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading': {
      const level = Number(block.level ?? 2)
      const cls = level === 1 ? 'text-3xl font-bold text-slate-950' : level === 2 ? 'text-2xl font-bold text-slate-950 pt-4' : 'text-xl font-semibold text-slate-900 pt-3'
      if (level === 1) return <h1 className={cls}>{String(block.content ?? '')}</h1>
      if (level === 3) return <h3 className={cls}>{String(block.content ?? '')}</h3>
      if (level === 4) return <h4 className={cls}>{String(block.content ?? '')}</h4>
      return <h2 className={cls}>{String(block.content ?? '')}</h2>
    }
    case 'paragraph':
      return <p dangerouslySetInnerHTML={html(block.content)} />
    case 'list': {
      const items = Array.isArray(block.items) ? block.items : []
      const Tag = String(block.style ?? 'bullet') === 'numbered' ? 'ol' : 'ul'
      return <Tag className={Tag === 'ol' ? 'list-decimal pl-6 space-y-2' : 'list-disc pl-6 space-y-2'}>{items.map((item, i) => <li key={i} dangerouslySetInnerHTML={html(item)} />)}</Tag>
    }
    case 'image':
      return (
        <figure className="space-y-2">
          <img src={String(block.url ?? '')} alt={String(block.alt ?? '')} className="rounded-2xl border border-slate-200 w-full object-cover" />
          {String(block.caption ?? '') && <figcaption className="text-sm text-slate-500 text-center">{String(block.caption)}</figcaption>}
        </figure>
      )
    case 'quote':
      return <blockquote className="border-l-4 border-blue-500 pl-4 italic text-slate-600" dangerouslySetInnerHTML={html(block.content)} />
    case 'tip':
      return <div className="rounded-2xl bg-green-50 border border-green-200 p-4"><p className="font-semibold text-green-800">{String(block.label ?? 'Tip')}</p><p dangerouslySetInnerHTML={html(block.content)} /></div>
    case 'warning':
      return <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4"><p className="font-semibold text-amber-800">{String(block.label ?? 'Important')}</p><p dangerouslySetInnerHTML={html(block.content)} /></div>
    case 'divider':
      return <hr className="border-slate-200 my-8" />
    case 'table': {
      const headers = Array.isArray(block.headers) ? block.headers : []
      const rows = Array.isArray(block.rows) ? block.rows : []
      return <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{headers.map((h, i) => <th key={i} className="px-4 py-3 text-left font-semibold">{String(h)}</th>)}</tr></thead><tbody>{rows.map((row: any, i) => <tr key={i} className="border-t">{(Array.isArray(row) ? row : []).map((cell, j) => <td key={j} className="px-4 py-3">{String(cell ?? '')}</td>)}</tr>)}</tbody></table></div>
    }
    case 'faq': {
      const items = Array.isArray(block.items) ? block.items : []
      return <div className="space-y-3">{items.map((item: any, i) => <div key={i} className="rounded-2xl border border-slate-200 p-4"><p className="font-semibold text-slate-950">{String(item.question ?? '')}</p><p className="mt-2" dangerouslySetInnerHTML={html(item.answer)} /></div>)}</div>
    }
    case 'cta':
      return <div className="rounded-3xl bg-slate-950 text-white p-6"><h3 className="text-2xl font-bold">{String(block.heading ?? '')}</h3><p className="mt-2 text-slate-300">{String(block.subtext ?? '')}</p></div>
    default:
      return <pre className="rounded-2xl bg-slate-100 p-4 text-xs overflow-x-auto">{JSON.stringify(block, null, 2)}</pre>
  }
}
