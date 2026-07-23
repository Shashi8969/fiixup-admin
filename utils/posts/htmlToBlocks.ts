// utils/posts/htmlToBlocks.ts
// Parses pasted content (HTML from Word/Google Docs/AI tools/web pages, or
// plain text/markdown) into this editor's Block[] shape. Browser-only
// (uses DOMParser) — only ever called from paste event handlers in a
// client component, never during render or on the server.

import type { Block } from '@/components/posts/editor/types'
import { sanitizeInlineElement } from '@/utils/posts/sanitizeInlineHtml'

type NewBlock = { type: string } & Record<string, unknown>

// ── HTML cleanup ──────────────────────────────────────────────────────────────
// Word/Google Docs paste HTML carries a lot of cruft: conditional comments,
// mso-* styles/classes, <o:p> tags, xml namespaces, inline style attributes.
// Strip it so the DOM walk below only sees meaningful structure.
function cleanHtml(html: string): string {
  return html
    .replace(/<!--\[if [\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<o:p>[\s\S]*?<\/o:p>/gi, '')
    .replace(/<\/?o:p>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\sxmlns(:\w+)?="[^"]*"/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
}

// Keep only the inline formatting the block `content` fields support — see
// utils/posts/sanitizeInlineHtml.ts for the canonical allowlist, shared with
// the WYSIWYG editor.
const inlineHtml = sanitizeInlineElement

function isEmpty(el: Element): boolean {
  const text = (el.textContent ?? '').replace(/ /g, ' ').trim()
  return text === '' && el.querySelector('img') === null
}

// ── DOM walk → blocks ─────────────────────────────────────────────────────────

function elementToBlocks(el: Element, out: NewBlock[]) {
  switch (el.tagName) {
    case 'H1': case 'H2': case 'H3': case 'H4': case 'H5': case 'H6': {
      if (isEmpty(el)) return
      out.push({ type: 'heading', level: Number(el.tagName[1]), content: inlineHtml(el) })
      return
    }
    case 'P': {
      if (isEmpty(el)) return
      const onlyImg = el.children.length === 1 && el.children[0].tagName === 'IMG' && (el.textContent ?? '').trim() === ''
      if (onlyImg) { elementToBlocks(el.children[0], out); return }
      // Word/Google Docs often mark heading paragraphs with a style class
      // (e.g. class="MsoHeading2", "Heading1Char") instead of a real <hN> tag.
      const headingMatch = el.className.match(/(?:Mso)?Heading\s?(\d)/i)
      if (headingMatch) { out.push({ type: 'heading', level: Number(headingMatch[1]), content: inlineHtml(el) }); return }
      out.push({ type: 'paragraph', content: inlineHtml(el) })
      return
    }
    case 'UL': case 'OL': {
      const items = Array.from(el.querySelectorAll(':scope > li')).map((li) => inlineHtml(li)).filter(Boolean)
      if (items.length === 0) return
      out.push({ type: 'list', style: el.tagName === 'OL' ? 'numbered' : 'bullet', items })
      return
    }
    case 'BLOCKQUOTE': {
      if (isEmpty(el)) return
      out.push({ type: 'quote', content: (el.textContent ?? '').trim(), author: '' })
      return
    }
    case 'PRE': {
      const codeEl = el.querySelector('code')
      const langMatch = codeEl?.className.match(/language-(\w+)/)
      out.push({ type: 'code', language: langMatch?.[1] ?? '', content: (codeEl ?? el).textContent ?? '' })
      return
    }
    case 'HR':
      out.push({ type: 'divider' })
      return
    case 'IMG': {
      const src = el.getAttribute('src') ?? ''
      if (!src || src.startsWith('data:')) return
      out.push({ type: 'image', url: src, alt: el.getAttribute('alt') ?? '', caption: '' })
      return
    }
    case 'TABLE': {
      const rows = Array.from(el.querySelectorAll('tr')).map((tr) =>
        Array.from(tr.querySelectorAll('th,td')).map((cell) => (cell.textContent ?? '').trim())
      )
      if (rows.length === 0) return
      const [headers, ...body] = rows
      out.push({ type: 'table', headers, rows: body.length ? body : [headers.map(() => '')] })
      return
    }
    case 'DIV': case 'SECTION': case 'ARTICLE': case 'BODY': case 'FIGURE':
      Array.from(el.children).forEach((child) => elementToBlocks(child, out))
      return
    case 'BR':
      return
    default:
      if (!isEmpty(el)) out.push({ type: 'paragraph', content: inlineHtml(el) })
  }
}

export function htmlToBlocks(rawHtml: string): { blocks: NewBlock[]; skippedImages: number } {
  const cleaned = cleanHtml(rawHtml)
  const doc = new DOMParser().parseFromString(cleaned, 'text/html')
  const skippedImages = doc.body.querySelectorAll('img[src^="data:"]').length
  const blocks: NewBlock[] = []
  Array.from(doc.body.children).forEach((el) => elementToBlocks(el, blocks))
  return { blocks, skippedImages }
}

// ── Plain-text / markdown fallback ────────────────────────────────────────────
// Used when the clipboard has no HTML payload — some AI tools and terminals
// only put plain text on the clipboard. Supports common markdown shapes.

export function textToBlocks(rawText: string): NewBlock[] {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n')
  const blocks: NewBlock[] = []
  let para: string[] = []
  let list: string[] | null = null
  let listStyle: 'bullet' | 'numbered' = 'bullet'
  let codeBuf: string[] | null = null

  const flushPara = () => { if (para.length) { blocks.push({ type: 'paragraph', content: para.join(' ').trim() }); para = [] } }
  const flushList = () => { if (list && list.length) blocks.push({ type: 'list', style: listStyle, items: list }); list = null }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line.startsWith('```')) {
      if (codeBuf === null) { flushPara(); flushList(); codeBuf = [] }
      else { blocks.push({ type: 'code', language: '', content: codeBuf.join('\n') }); codeBuf = null }
      continue
    }
    if (codeBuf !== null) { codeBuf.push(rawLine); continue }
    if (line === '') { flushPara(); flushList(); continue }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) { flushPara(); flushList(); blocks.push({ type: 'heading', level: heading[1].length, content: heading[2].trim() }); continue }

    const bullet = line.match(/^[-*•]\s+(.*)$/)
    const numbered = line.match(/^\d+[.)]\s+(.*)$/)
    if (bullet || numbered) {
      flushPara()
      const style = numbered ? 'numbered' : 'bullet'
      if (!list || listStyle !== style) { flushList(); list = []; listStyle = style }
      list!.push((bullet ?? numbered)![1].trim())
      continue
    }
    flushList()

    const quote = line.match(/^>\s?(.*)$/)
    if (quote) { flushPara(); blocks.push({ type: 'quote', content: quote[1].trim(), author: '' }); continue }

    para.push(line)
  }
  flushPara()
  flushList()
  if (codeBuf !== null && codeBuf.length) blocks.push({ type: 'code', language: '', content: codeBuf.join('\n') })

  return blocks
}

export function pasteToBlocks(html: string, text: string): { blocks: NewBlock[]; skippedImages: number; source: 'html' | 'text' } {
  const hasRealHtml = /<\/?(p|div|h[1-6]|ul|ol|li|table|blockquote|pre)[\s>]/i.test(html)
  if (hasRealHtml) {
    const { blocks, skippedImages } = htmlToBlocks(html)
    if (blocks.length) return { blocks, skippedImages, source: 'html' }
  }
  return { blocks: textToBlocks(text), skippedImages: 0, source: 'text' }
}
