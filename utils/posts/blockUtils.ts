import type { Block } from '@/components/posts/editor/types'

export function defaultBlock(type: string): Omit<Block, '_id'> {
  switch (type) {
    case 'heading':      return { type, level: 2, content: 'New Heading' }
    case 'paragraph':    return { type, content: 'Write your paragraph here…' }
    case 'list':         return { type, style: 'bullet', items: ['Item 1', 'Item 2'] }
    case 'table':        return { type, headers: ['Column 1', 'Column 2'], rows: [['Cell 1', 'Cell 2']] }
    case 'tip':          return { type, content: 'Your tip here.', label: 'Fiixup Tip' }
    case 'warning':      return { type, content: 'Your warning here.', label: 'Important' }
    case 'image':        return { type, url: '', alt: '', caption: '' }
    case 'quote':        return { type, content: 'Quote text here.', author: '' }
    case 'code':         return { type, language: 'javascript', content: '// code here' }
    case 'divider':      return { type }
    case 'cta':          return { type, heading: 'Book Doorstep Service', subtext: 'Fast, certified mechanics at your location.', buttonText: 'Book Now', buttonHref: '/contact' }
    case 'faq':          return { type, items: [{ question: 'Question here?', answer: 'Answer here.' }] }
    case 'steps':        return { type, items: [{ title: 'Step 1', description: 'Description.' }] }
    case 'link':         return { type, text: 'Link text', href: '/', external: false }
    case 'service_card': return { type, title: 'Service Name', description: 'Service description.', price: '₹499', href: '' }
    case 'pros_cons':    return { type, pros: ['Pro 1'], cons: ['Con 1'] }
    case 'comparison':   return { type, headers: ['Option A', 'Option B'], rows: [{ label: 'Feature', values: ['Value A', 'Value B'] }] }
    default:             return { type, content: '' }
  }
}

export function uid() { return Math.random().toString(36).slice(2, 9) }

export function toBlocks(raw: unknown): Block[] {
  let arr: unknown[] = []
  if (Array.isArray(raw)) arr = raw
  else if (typeof raw === 'string') { try { arr = JSON.parse(raw) } catch { arr = [] } }
  return arr.map((b: any) => ({ ...b, _id: uid() }))
}

export function stripIds(blocks: Block[]): Record<string, unknown>[] {
  return blocks.map(({ _id, ...rest }) => rest)
}
