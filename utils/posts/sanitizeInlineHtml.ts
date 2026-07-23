// utils/posts/sanitizeInlineHtml.ts
// Single canonical definition of "safe inline HTML" for block content fields
// that get rendered via dangerouslySetInnerHTML on the public site (see
// components/posts/editor/BlogPostLivePreview.tsx: paragraph/quote/tip/
// warning/list-item/faq-answer). Used by both the paste importer
// (utils/posts/htmlToBlocks.ts) and the rich text editor
// (components/posts/editor/RichTextField.tsx) so there is one contract
// instead of two independent implicit ones. Browser-only (DOMParser).

export const INLINE_ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'A', 'U', 'BR', 'SPAN', 'CODE'])

// Strips everything except the allowed inline tags from an already-parsed
// DOM element, keeping only `href` on <a>, and unwraps disallowed elements
// (keeps their text/children) rather than deleting their contents outright.
export function sanitizeInlineElement(el: Element): string {
  const clone = el.cloneNode(true) as Element
  clone.querySelectorAll('*').forEach((node) => {
    if (!INLINE_ALLOWED.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes))
      return
    }
    Array.from(node.attributes).forEach((attr) => {
      if (!(node.tagName === 'A' && attr.name === 'href')) node.removeAttribute(attr.name)
    })
    if (node.tagName === 'SPAN') node.replaceWith(...Array.from(node.childNodes))
  })
  return clone.innerHTML.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

// Same, but takes a raw HTML string (e.g. TipTap's editor.getHTML()) instead
// of a parsed Element.
export function sanitizeInlineHtml(rawHtml: string): string {
  const doc = new DOMParser().parseFromString(`<div>${rawHtml}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  return sanitizeInlineElement(root)
}
