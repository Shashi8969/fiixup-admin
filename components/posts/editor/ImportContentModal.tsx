'use client'

import { useState } from 'react'
import {
  AlertTriangle, ClipboardPaste, Code2, FileText, HelpCircle, Image as ImageIcon,
  List, Minus, Quote, Table, Type, X,
} from 'lucide-react'
import type { Block } from '@/components/posts/editor/types'
import { uid } from '@/utils/posts/blockUtils'
import { pasteToBlocks } from '@/utils/posts/htmlToBlocks'

type NewBlock = { type: string } & Record<string, unknown>

const TYPE_ICON: Record<string, typeof FileText> = {
  heading: Type, paragraph: FileText, list: List, quote: Quote,
  code: Code2, divider: Minus, image: ImageIcon, table: Table, faq: HelpCircle,
}

function excerpt(block: NewBlock): string {
  if (block.type === 'list') return (block.items as string[] | undefined)?.join(' · ') ?? ''
  if (block.type === 'table') return `${(block.headers as string[] | undefined)?.length ?? 0} columns`
  if (block.type === 'divider') return '—'
  if (block.type === 'image') return String(block.url ?? '')
  const raw = String(block.content ?? '')
  const text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > 90 ? text.slice(0, 90) + '…' : text
}

export function ImportContentModal({ hasExistingBlocks, onInsert, onClose }: {
  hasExistingBlocks: boolean
  onInsert: (blocks: Block[], mode: 'append' | 'replace') => void
  onClose: () => void
}) {
  const [parsed, setParsed] = useState<NewBlock[]>([])
  const [skippedImages, setSkippedImages] = useState(0)
  const [source, setSource] = useState<'html' | 'text' | null>(null)
  const [mode, setMode] = useState<'append' | 'replace'>('append')

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const html = e.clipboardData.getData('text/html')
    const text = e.clipboardData.getData('text/plain')
    if (!html && !text) return
    const result = pasteToBlocks(html, text)
    setParsed(result.blocks)
    setSkippedImages(result.skippedImages)
    setSource(result.source)
  }

  const handleInsert = () => {
    if (!parsed.length) return
    if (mode === 'replace' && hasExistingBlocks) {
      const ok = window.confirm('Replace all existing content blocks with the imported content? This cannot be undone unless you leave without saving.')
      if (!ok) return
    }
    onInsert(parsed.map((b) => ({ ...b, _id: uid() }) as Block), mode)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="admin-card w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3e]">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-[#e2e8f0]">Paste / Import Content</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <p className="text-xs text-[#6b7280] leading-relaxed">
            Paste HTML, AI-generated content, or content copied from Word / Google Docs / a webpage.
            Headings, paragraphs, lists, quotes, tables, and code blocks are detected automatically —
            plain text with <code className="text-blue-400">#</code> headings and <code className="text-blue-400">-</code> lists
            also works if the clipboard has no formatting.
          </p>

          <div
            contentEditable
            suppressContentEditableWarning
            onPaste={handlePaste}
            data-placeholder="Click here, then press Ctrl+V (Cmd+V on Mac) to paste…"
            className="admin-input min-h-[70px] flex items-center text-sm text-[#6b7280] before:content-[attr(data-placeholder)] empty:before:block cursor-text"
          />

          {parsed.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#9ca3af]">
                  Detected {parsed.length} block{parsed.length !== 1 ? 's' : ''}
                  {source === 'text' ? ' (parsed as plain text)' : ''}
                </p>
                <div className="flex gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[#9ca3af]">
                    <input type="radio" name="import-mode" checked={mode === 'append'} onChange={() => setMode('append')} />
                    Append to end
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[#9ca3af]">
                    <input type="radio" name="import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                    Replace all content
                  </label>
                </div>
              </div>

              {skippedImages > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{skippedImages} embedded image{skippedImages !== 1 ? 's were' : ' was'} skipped (pasted as inline data, not a URL). Upload {skippedImages !== 1 ? 'them' : 'it'} via the Image block or Media Library instead.</span>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {parsed.map((block, i) => {
                  const Icon = TYPE_ICON[block.type] ?? FileText
                  return (
                    <div key={i} className="flex items-start gap-2 bg-[#1a1d27] border border-[#2a2d3e] rounded-lg px-3 py-2">
                      <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                          {block.type}{block.type === 'heading' ? ` H${block.level}` : ''}
                        </span>
                        <p className="text-xs text-[#e2e8f0] truncate">{excerpt(block)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#2a2d3e]">
          <button onClick={onClose} className="admin-btn-secondary text-sm">Cancel</button>
          <button onClick={handleInsert} disabled={!parsed.length} className="admin-btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed">
            Insert {parsed.length || ''} Block{parsed.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
