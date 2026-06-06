'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import {
  AlertTriangle, BarChart3, CheckSquare, ChevronDown, ChevronUp, Code2,
  FileText, Footprints, GripVertical, HelpCircle, Image as ImageIcon,
  LayoutGrid, Link2, List, Megaphone, Minus, Plus, Quote, Table,
  Trash2, Type,
} from 'lucide-react'
import type { Block } from '@/components/posts/editor/types'
import { defaultBlock, uid } from '@/utils/posts/blockUtils'

const BLOCK_TYPES = [
  { type: 'heading',      icon: Type,          label: 'Heading',      color: 'text-purple-400' },
  { type: 'paragraph',    icon: FileText,       label: 'Paragraph',    color: 'text-blue-400'   },
  { type: 'list',         icon: List,           label: 'List',         color: 'text-green-400'  },
  { type: 'table',        icon: Table,          label: 'Table',        color: 'text-cyan-400'   },
  { type: 'tip',          icon: CheckSquare,    label: 'Tip',          color: 'text-amber-400'  },
  { type: 'warning',      icon: AlertTriangle,  label: 'Warning',      color: 'text-red-400'    },
  { type: 'image',        icon: ImageIcon,      label: 'Image',        color: 'text-pink-400'   },
  { type: 'quote',        icon: Quote,          label: 'Quote',        color: 'text-indigo-400' },
  { type: 'code',         icon: Code2,          label: 'Code',         color: 'text-green-300'  },
  { type: 'divider',      icon: Minus,          label: 'Divider',      color: 'text-gray-400'   },
  { type: 'cta',          icon: Megaphone,      label: 'CTA',          color: 'text-orange-400' },
  { type: 'faq',          icon: HelpCircle,     label: 'FAQ',          color: 'text-yellow-400' },
  { type: 'steps',        icon: Footprints,     label: 'Steps',        color: 'text-teal-400'   },
  { type: 'link',         icon: Link2,          label: 'Link',         color: 'text-blue-300'   },
  { type: 'service_card', icon: LayoutGrid,     label: 'Service Card', color: 'text-violet-400' },
  { type: 'pros_cons',    icon: BarChart3,      label: 'Pros / Cons',  color: 'text-emerald-400'},
  { type: 'comparison',   icon: Table,          label: 'Comparison',   color: 'text-rose-400'   },
] as const

export function BlockEditor({ blocks, onChange }: { blocks: Block[]; onChange: (b: Block[]) => void }) {
  const [showPicker, setShowPicker] = useState<number | null>(null)

  const addBlock = (type: string, afterIndex: number) => {
    const nb = { ...defaultBlock(type), _id: uid() } as Block
    const next = [...blocks]
    next.splice(afterIndex + 1, 0, nb)
    onChange(next)
    setShowPicker(null)
  }
  const updateBlock = (i: number, b: Block) => { const n = [...blocks]; n[i] = b; onChange(n) }
  const removeBlock = (i: number) => onChange(blocks.filter((_, idx) => idx !== i))
  const moveBlock   = (i: number, dir: -1|1) => {
    const n = [...blocks], t = i + dir
    if (t < 0 || t >= n.length) return
    ;[n[i], n[t]] = [n[t], n[i]]; onChange(n)
  }

  return (
    <div className="space-y-2">
      <AddBlockRow onAdd={(t) => addBlock(t, -1)} open={showPicker === -1} onToggle={() => setShowPicker(showPicker === -1 ? null : -1)} />
      {blocks.length === 0 && (
        <div className="admin-card p-10 text-center text-[#6b7280] text-sm">
          No blocks yet. Click <strong>+ Add Block</strong> above to start writing.
        </div>
      )}
      {blocks.map((block, i) => (
        <div key={block._id}>
          <BlockCard block={block} index={i} total={blocks.length}
            onUpdate={(b) => updateBlock(i, b)}
            onRemove={() => removeBlock(i)}
            onMove={(dir) => moveBlock(i, dir)} />
          <AddBlockRow onAdd={(t) => addBlock(t, i)} open={showPicker === i} onToggle={() => setShowPicker(showPicker === i ? null : i)} />
        </div>
      ))}
    </div>
  )
}

function AddBlockRow({ onAdd, open, onToggle }: { onAdd: (t: string) => void; open: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 py-1">
        <button onClick={onToggle}
          className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-[#2a2d3e]">
          <Plus className="w-3.5 h-3.5" /> Add Block
        </button>
        <div className="flex-1 h-px bg-[#2a2d3e]" />
      </div>
      {open && (
        <div className="absolute top-8 left-0 z-20 bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl shadow-xl p-3 w-72">
          <p className="text-xs text-[#6b7280] font-semibold uppercase tracking-wider mb-2 px-1">Choose block type</p>
          <div className="grid grid-cols-2 gap-1">
            {BLOCK_TYPES.map(({ type, icon: Icon, label, color }) => (
              <button key={type} onClick={() => onAdd(type)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2a2d3e] text-left transition-colors">
                <Icon className={clsx('w-4 h-4 shrink-0', color)} />
                <span className="text-xs text-[#e2e8f0]">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BlockCard({ block, index, total, onUpdate, onRemove, onMove }: {
  block: Block; index: number; total: number
  onUpdate: (b: Block) => void; onRemove: () => void; onMove: (dir: -1|1) => void
}) {
  const meta = BLOCK_TYPES.find(b => b.type === block.type)
  const Icon = meta?.icon ?? FileText
  return (
    <div className="admin-card border border-[#2a2d3e] hover:border-[#3a3d4e] transition-colors">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2a2d3e] bg-[#1a1d27] rounded-t-xl">
        <GripVertical className="w-4 h-4 text-[#6b7280] shrink-0" />
        <Icon className={clsx('w-4 h-4 shrink-0', meta?.color ?? 'text-gray-400')} />
        <span className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider flex-1">
          {meta?.label ?? block.type}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0}
            className="p-1 rounded hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white disabled:opacity-30 transition-colors">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}
            className="p-1 rounded hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white disabled:opacity-30 transition-colors">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRemove}
            className="p-1 rounded hover:bg-red-500/10 text-[#6b7280] hover:text-red-400 transition-colors ml-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <BlockFields block={block} onUpdate={onUpdate} />
      </div>
    </div>
  )
}

function BlockFields({ block, onUpdate }: { block: Block; onUpdate: (b: Block) => void }) {
  const set = (k: string, v: unknown) => onUpdate({ ...block, [k]: v })

  switch (block.type) {
    case 'heading':
      return (
        <div className="space-y-3">
          <select value={String(block.level ?? 2)} onChange={(e) => set('level', +e.target.value)} className="admin-input w-24 text-sm">
            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>H{n}</option>)}
          </select>
          <input className="admin-input w-full" value={String(block.content ?? '')} onChange={(e) => set('content', e.target.value)} placeholder="Heading text…" />
        </div>
      )
    case 'paragraph':
      return <textarea className="admin-textarea w-full min-h-[100px]" value={String(block.content ?? '')} onChange={(e) => set('content', e.target.value)} placeholder="Paragraph… (HTML allowed: <strong>, <em>, <a href=''>)" />
    case 'list':
      return (
        <div className="space-y-3">
          <select value={String(block.style ?? 'bullet')} onChange={(e) => set('style', e.target.value)} className="admin-input w-36 text-sm">
            <option value="bullet">Bullet list</option>
            <option value="numbered">Numbered list</option>
          </select>
          <ListItemsEditor items={Array.isArray(block.items) ? block.items.map(String) : []} onChange={(it) => set('items', it)} />
        </div>
      )
    case 'table':
      return <TableEditor block={block} onUpdate={onUpdate} />
    case 'tip':
    case 'warning':
      return (
        <div className="space-y-3">
          <input className="admin-input w-full" value={String(block.label ?? '')} onChange={(e) => set('label', e.target.value)} placeholder={block.type === 'tip' ? 'Label (e.g. Fiixup Tip)' : 'Label (e.g. Important)'} />
          <textarea className="admin-textarea w-full min-h-[80px]" value={String(block.content ?? '')} onChange={(e) => set('content', e.target.value)} placeholder="Content… (HTML allowed)" />
        </div>
      )
    case 'image':
      return (
        <div className="space-y-3">
          <input className="admin-input w-full" value={String(block.url ?? '')} onChange={(e) => set('url', e.target.value)} placeholder="Image URL (Supabase storage or CDN)" />
          <input className="admin-input w-full" value={String(block.alt ?? '')} onChange={(e) => set('alt', e.target.value)} placeholder="Alt text (required for SEO)" />
          <input className="admin-input w-full" value={String(block.caption ?? '')} onChange={(e) => set('caption', e.target.value)} placeholder="Caption (optional)" />
          {String(block.url ?? '') && (
            <div className="rounded-lg overflow-hidden border border-[#2a2d3e] bg-[#0f1117] p-2">
              <img src={String(block.url)} alt={String(block.alt ?? '')} className="max-h-40 object-contain rounded" />
            </div>
          )}
        </div>
      )
    case 'quote':
      return (
        <div className="space-y-3">
          <textarea className="admin-textarea w-full min-h-[80px]" value={String(block.content ?? '')} onChange={(e) => set('content', e.target.value)} placeholder="Quote text…" />
          <input className="admin-input w-full" value={String(block.author ?? '')} onChange={(e) => set('author', e.target.value)} placeholder="Author (optional)" />
        </div>
      )
    case 'code':
      return (
        <div className="space-y-3">
          <input className="admin-input w-48" value={String(block.language ?? '')} onChange={(e) => set('language', e.target.value)} placeholder="Language (e.g. javascript)" />
          <textarea className="admin-textarea w-full font-mono text-xs min-h-[120px]" value={String(block.content ?? '')} onChange={(e) => set('content', e.target.value)} placeholder="// code…" spellCheck={false} />
        </div>
      )
    case 'divider':
      return <p className="text-xs text-[#6b7280] italic">Horizontal divider — no fields to edit.</p>
    case 'cta':
      return (
        <div className="space-y-3">
          <input className="admin-input w-full" value={String(block.heading ?? '')} onChange={(e) => set('heading', e.target.value)} placeholder="CTA heading" />
          <input className="admin-input w-full" value={String(block.subtext ?? '')} onChange={(e) => set('subtext', e.target.value)} placeholder="Subtext (optional)" />
          <div className="grid grid-cols-2 gap-3">
            <input className="admin-input" value={String(block.buttonText ?? '')} onChange={(e) => set('buttonText', e.target.value)} placeholder="Button text" />
            <input className="admin-input" value={String(block.buttonHref ?? '')} onChange={(e) => set('buttonHref', e.target.value)} placeholder="/contact or tel:number" />
          </div>
        </div>
      )
    case 'faq':
      return <FaqEditor items={Array.isArray(block.items) ? block.items as any[] : []} onChange={(it) => set('items', it)} />
    case 'steps':
      return <StepsEditor items={Array.isArray(block.items) ? block.items as any[] : []} onChange={(it) => set('items', it)} />
    case 'link':
      return (
        <div className="space-y-3">
          <input className="admin-input w-full" value={String(block.text ?? '')} onChange={(e) => set('text', e.target.value)} placeholder="Link text" />
          <input className="admin-input w-full" value={String(block.href ?? '')} onChange={(e) => set('href', e.target.value)} placeholder="/page or https://…" />
          <label className="flex items-center gap-2 text-sm text-[#9ca3af] cursor-pointer">
            <input type="checkbox" checked={Boolean(block.external)} onChange={(e) => set('external', e.target.checked)} className="rounded" />
            Open in new tab
          </label>
        </div>
      )
    case 'service_card':
      return (
        <div className="space-y-3">
          <input className="admin-input w-full" value={String(block.title ?? '')} onChange={(e) => set('title', e.target.value)} placeholder="Service name" />
          <textarea className="admin-textarea w-full min-h-[70px]" value={String(block.description ?? '')} onChange={(e) => set('description', e.target.value)} placeholder="Short description" />
          <div className="grid grid-cols-2 gap-3">
            <input className="admin-input" value={String(block.price ?? '')} onChange={(e) => set('price', e.target.value)} placeholder="Starting price (₹499)" />
            <input className="admin-input" value={String(block.href ?? '')} onChange={(e) => set('href', e.target.value)} placeholder="Link URL (optional)" />
          </div>
        </div>
      )
    case 'pros_cons':
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-green-400 mb-2">Pros</p>
            <ListItemsEditor items={Array.isArray(block.pros) ? block.pros.map(String) : []} onChange={(it) => set('pros', it)} placeholder="Add a pro…" />
          </div>
          <div>
            <p className="text-xs font-semibold text-red-400 mb-2">Cons</p>
            <ListItemsEditor items={Array.isArray(block.cons) ? block.cons.map(String) : []} onChange={(it) => set('cons', it)} placeholder="Add a con…" />
          </div>
        </div>
      )
    case 'comparison':
      return <ComparisonEditor block={block} onUpdate={onUpdate} />
    default:
      return <p className="text-xs text-[#6b7280] italic">Unknown block type: <code className="text-blue-400">{block.type}</code></p>
  }
}

function ListItemsEditor({ items, onChange, placeholder = 'Add item…' }: { items: string[]; onChange: (it: string[]) => void; placeholder?: string }) {
  const upd = (i: number, v: string) => { const n = [...items]; n[i] = v; onChange(n) }
  const rem = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input className="admin-input flex-1 text-sm" value={item} onChange={(e) => upd(i, e.target.value)} placeholder={placeholder} />
          <button onClick={() => rem(i)} className="p-1.5 rounded hover:bg-red-500/10 text-[#6b7280] hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ''])} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add item</button>
    </div>
  )
}

function FaqEditor({ items, onChange }: { items: { question: string; answer: string }[]; onChange: (it: any[]) => void }) {
  const upd = (i: number, k: string, v: string) => { const n = items.map(x => ({...x})); n[i] = {...n[i], [k]: v}; onChange(n) }
  const rem = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="bg-[#1a1d27] rounded-xl p-4 space-y-2 border border-[#2a2d3e]">
          <div className="flex justify-between"><span className="text-xs text-[#6b7280] font-semibold">Q{i+1}</span>
            <button onClick={() => rem(i)} className="text-[#6b7280] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></div>
          <input className="admin-input w-full text-sm" value={item.question} onChange={(e) => upd(i, 'question', e.target.value)} placeholder="Question?" />
          <textarea className="admin-textarea w-full min-h-[70px] text-sm" value={item.answer} onChange={(e) => upd(i, 'answer', e.target.value)} placeholder="Answer… (HTML allowed)" />
        </div>
      ))}
      <button onClick={() => onChange([...items, { question: '', answer: '' }])} className="text-xs text-blue-400 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add FAQ item</button>
    </div>
  )
}

function StepsEditor({ items, onChange }: { items: { title: string; description: string }[]; onChange: (it: any[]) => void }) {
  const upd = (i: number, k: string, v: string) => { const n = items.map(x => ({...x})); n[i] = {...n[i], [k]: v}; onChange(n) }
  const rem = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3">
          <div className="shrink-0 w-7 h-7 bg-[#2a2d3e] rounded-full flex items-center justify-center text-xs font-bold text-[#9ca3af] mt-2">{i+1}</div>
          <div className="flex-1 space-y-2">
            <input className="admin-input w-full text-sm" value={item.title} onChange={(e) => upd(i, 'title', e.target.value)} placeholder="Step title" />
            <textarea className="admin-textarea w-full text-sm min-h-[60px]" value={item.description} onChange={(e) => upd(i, 'description', e.target.value)} placeholder="Step description" />
          </div>
          <button onClick={() => rem(i)} className="shrink-0 mt-2 text-[#6b7280] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { title: '', description: '' }])} className="text-xs text-blue-400 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add step</button>
    </div>
  )
}

function TableEditor({ block, onUpdate }: { block: Block; onUpdate: (b: Block) => void }) {
  const headers = Array.isArray(block.headers) ? block.headers.map(String) : ['Column 1']
  const rows    = Array.isArray(block.rows)    ? (block.rows as unknown[][]).map(r => Array.isArray(r) ? r.map(String) : []) : [['']]
  const setH = (h: string[]) => onUpdate({ ...block, headers: h })
  const setR = (r: string[][]) => onUpdate({ ...block, rows: r })
  const updH = (i: number, v: string) => { const h = [...headers]; h[i] = v; setH(h) }
  const addCol = () => { setH([...headers, `Col ${headers.length+1}`]); setR(rows.map(r => [...r, ''])) }
  const remCol = (i: number) => { setH(headers.filter((_,ci) => ci !== i)); setR(rows.map(r => r.filter((_,ci) => ci !== i))) }
  const updC = (ri: number, ci: number, v: string) => { const r = rows.map(row => [...row]); r[ri][ci] = v; setR(r) }
  const addRow = () => setR([...rows, Array(headers.length).fill('')])
  const remRow = (i: number) => setR(rows.filter((_,ri) => ri !== i))
  return (
    <div className="space-y-3 overflow-x-auto">
      <div className="flex gap-2 items-center">
        <button onClick={addCol} className="text-xs text-blue-400 flex items-center gap-1"><Plus className="w-3 h-3"/>Col</button>
        <button onClick={addRow} className="text-xs text-blue-400 flex items-center gap-1"><Plus className="w-3 h-3"/>Row</button>
        <input className="admin-input text-xs flex-1 max-w-xs" value={String(block.caption ?? '')} onChange={(e) => onUpdate({...block, caption: e.target.value})} placeholder="Caption (optional)" />
      </div>
      <table className="text-xs border-collapse">
        <thead><tr>
          {headers.map((h, i) => (
            <th key={i} className="border border-[#2a2d3e] p-1">
              <div className="flex gap-1">
                <input className="admin-input text-xs w-24 font-semibold" value={h} onChange={(e) => updH(i, e.target.value)} />
                <button onClick={() => remCol(i)} className="text-[#6b7280] hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
              </div>
            </th>
          ))}
          <th className="border border-[#2a2d3e] p-1 w-8"/>
        </tr></thead>
        <tbody>{rows.map((row, ri) => (
          <tr key={ri}>{row.map((cell, ci) => (
            <td key={ci} className="border border-[#2a2d3e] p-1">
              <input className="admin-input text-xs w-24" value={cell} onChange={(e) => updC(ri, ci, e.target.value)} />
            </td>
          ))}
          <td className="border border-[#2a2d3e] p-1">
            <button onClick={() => remRow(ri)} className="text-[#6b7280] hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
          </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function ComparisonEditor({ block, onUpdate }: { block: Block; onUpdate: (b: Block) => void }) {
  const headers = Array.isArray(block.headers) ? block.headers.map(String) : []
  const rows    = Array.isArray(block.rows) ? block.rows as { label: string; values: string[] }[] : []
  const set = (k: string, v: unknown) => onUpdate({ ...block, [k]: v })
  const updH = (i: number, v: string) => { const h = [...headers]; h[i] = v; set('headers', h) }
  const updV = (ri: number, vi: number, v: string) => {
    const r = rows.map(row => ({ ...row, values: [...(row.values ?? [])] }))
    r[ri].values[vi] = v; set('rows', r)
  }
  const updLabel = (ri: number, v: string) => { const r = rows.map(row => ({...row})); r[ri].label = v; set('rows', r) }
  const remRow = (i: number) => set('rows', rows.filter((_, ri) => ri !== i))
  return (
    <div className="space-y-3 overflow-x-auto">
      <div className="flex gap-2 flex-wrap items-center">
        <p className="text-xs text-[#6b7280] font-semibold">Headers:</p>
        {headers.map((h, i) => (
          <input key={i} className="admin-input text-xs w-28" value={h} onChange={(e) => updH(i, e.target.value)} />
        ))}
        <button onClick={() => set('headers', [...headers, `Option ${headers.length+1}`])} className="text-xs text-blue-400 flex items-center gap-1"><Plus className="w-3 h-3"/>Header</button>
      </div>
      <div className="space-y-2">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-2 items-center">
            <input className="admin-input text-xs w-32 shrink-0" value={row.label} onChange={(e) => updLabel(ri, e.target.value)} placeholder="Feature" />
            {(row.values ?? []).map((v, vi) => (
              <input key={vi} className="admin-input text-xs w-24" value={v} onChange={(e) => updV(ri, vi, e.target.value)} placeholder="✓ / ✗ / text" />
            ))}
            <button onClick={() => remRow(ri)} className="text-[#6b7280] hover:text-red-400 shrink-0"><Trash2 className="w-3.5 h-3.5"/></button>
          </div>
        ))}
        <button onClick={() => set('rows', [...rows, { label: 'Feature', values: Array(headers.length).fill('') }])} className="text-xs text-blue-400 flex items-center gap-1"><Plus className="w-3 h-3"/>Add row</button>
      </div>
    </div>
  )
}
