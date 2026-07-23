'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import { clsx } from 'clsx'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code2,
  Link2, Unlink, Eraser, Undo2, Redo2, Search,
} from 'lucide-react'
import { sanitizeInlineHtml } from '@/utils/posts/sanitizeInlineHtml'
import { useLinkOptions } from '@/components/posts/editor/LinkOptionsContext'

export function RichTextField({ value, onChange, placeholder, compact }: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  compact?: boolean
}) {
  const lastEmitted = useRef(value)
  const [linkPopover, setLinkPopover] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkNewTab, setLinkNewTab] = useState(false)
  const [linkQuery, setLinkQuery] = useState('')
  const [showLinkSearch, setShowLinkSearch] = useState(false)
  const linkOptions = useLinkOptions()

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } },
      }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write…' }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const clean = sanitizeInlineHtml(editor.getHTML())
      lastEmitted.current = clean
      onChange(clean)
    },
    editorProps: {
      attributes: { class: 'rt-content' },
      // The schema here only ever holds one paragraph (see sanitizeInlineHtml —
      // these fields render as the full contents of a single existing <p>/
      // <blockquote>/<li> via dangerouslySetInnerHTML, so a second top-level
      // block would produce invalid nested markup). Enter inserts a line
      // break instead of splitting into a new block.
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          const hardBreak = view.state.schema.nodes.hardBreak
          if (hardBreak) view.dispatch(view.state.tr.replaceSelectionWith(hardBreak.create()).scrollIntoView())
          return true
        }
        return false
      },
    },
  })

  // Sync external value changes (e.g. paste-import replacing this block,
  // post reload) without resetting the cursor on every keystroke — only
  // when the incoming value differs from what this field itself last emitted.
  useEffect(() => {
    if (!editor) return
    if (value === lastEmitted.current) return
    if (value === editor.getHTML()) { lastEmitted.current = value; return }
    editor.commands.setContent(value, { emitUpdate: false })
    lastEmitted.current = value
  }, [value, editor])

  const filteredLinkOptions = useMemo(() => {
    const term = linkQuery.trim().toLowerCase()
    if (!term) return linkOptions.slice(0, 25)
    return linkOptions.filter((o) => `${o.label} ${o.href}`.toLowerCase().includes(term)).slice(0, 25)
  }, [linkOptions, linkQuery])

  if (!editor) {
    return <div className={clsx('admin-input', compact ? 'min-h-[70px]' : 'min-h-[100px]')} />
  }

  const openLinkPopover = () => {
    const existing = editor.getAttributes('link').href as string | undefined
    setLinkUrl(existing ?? '')
    setLinkNewTab(editor.getAttributes('link').target === '_blank')
    setShowLinkSearch(false)
    setLinkQuery('')
    setLinkPopover(true)
  }

  const applyLink = (href: string, newTab: boolean) => {
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: href.trim(), target: newTab ? '_blank' : null }).run()
    }
    setLinkPopover(false)
  }

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkPopover(false)
  }

  return (
    <div className="rt-field admin-input p-0 overflow-visible">
      <div className={clsx('flex items-center gap-0.5 border-b border-[#2a2d3e] flex-wrap relative', compact ? 'p-1' : 'p-1.5')}>
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold (Ctrl+B)"><Bold className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic (Ctrl+I)"><Italic className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline (Ctrl+U)"><UnderlineIcon className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} label="Inline code"><Code2 className="w-3.5 h-3.5" /></ToolbarButton>
        <div className="w-px h-4 bg-[#2a2d3e] mx-1" />
        <ToolbarButton active={editor.isActive('link')} onClick={openLinkPopover} label="Insert / edit link"><Link2 className="w-3.5 h-3.5" /></ToolbarButton>
        {editor.isActive('link') && (
          <ToolbarButton onClick={removeLink} label="Remove link"><Unlink className="w-3.5 h-3.5" /></ToolbarButton>
        )}
        <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().run()} label="Clear formatting"><Eraser className="w-3.5 h-3.5" /></ToolbarButton>
        <div className="w-px h-4 bg-[#2a2d3e] mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} label="Undo (Ctrl+Z)"><Undo2 className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} label="Redo (Ctrl+Y)"><Redo2 className="w-3.5 h-3.5" /></ToolbarButton>

        {linkPopover && (
          <div className="absolute top-full left-0 mt-1 z-30 w-80 bg-[#111827] border border-[#2a2d3e] rounded-xl shadow-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                {showLinkSearch ? 'Search site pages' : 'Link URL'}
              </p>
              <button onClick={() => setShowLinkSearch((v) => !v)} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <Search className="w-3 h-3" /> {showLinkSearch ? 'Type a URL instead' : 'Browse site pages'}
              </button>
            </div>

            {showLinkSearch ? (
              <div>
                <input autoFocus className="admin-input text-sm" placeholder="Search pages…" value={linkQuery} onChange={(e) => setLinkQuery(e.target.value)} />
                <div className="max-h-48 overflow-y-auto mt-2 space-y-0.5">
                  {filteredLinkOptions.map((opt) => (
                    <button key={`${opt.target_type}-${opt.target_id}-${opt.href}`}
                      onClick={() => applyLink(opt.href, linkNewTab)}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#2a2d3e] text-xs">
                      <div className="text-[#e2e8f0] truncate">{opt.label}</div>
                      <div className="text-[#6b7280] truncate">{opt.href}</div>
                    </button>
                  ))}
                  {filteredLinkOptions.length === 0 && <p className="text-xs text-[#6b7280] py-2 text-center">No matching pages.</p>}
                </div>
              </div>
            ) : (
              <input autoFocus className="admin-input text-sm" placeholder="/services or https://…" value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyLink(linkUrl, linkNewTab) }} />
            )}

            <label className="flex items-center gap-2 text-xs text-[#9ca3af] cursor-pointer">
              <input type="checkbox" checked={linkNewTab} onChange={(e) => setLinkNewTab(e.target.checked)} className="rounded" />
              Open in new tab
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setLinkPopover(false)} className="admin-btn-secondary text-xs px-3 py-1.5">Cancel</button>
              {!showLinkSearch && (
                <button onClick={() => applyLink(linkUrl, linkNewTab)} className="admin-btn-primary text-xs px-3 py-1.5">Apply</button>
              )}
            </div>
          </div>
        )}
      </div>
      <EditorContent editor={editor} className={compact ? 'rt-editor-compact' : 'rt-editor'} />
    </div>
  )
}

function ToolbarButton({ children, onClick, active, label }: {
  children: React.ReactNode; onClick: () => void; active?: boolean; label: string
}) {
  return (
    <button type="button" onClick={onClick} title={label}
      className={clsx('p-1.5 rounded-md transition-colors',
        active ? 'bg-blue-600 text-white' : 'text-[#9ca3af] hover:bg-[#2a2d3e] hover:text-white')}>
      {children}
    </button>
  )
}
