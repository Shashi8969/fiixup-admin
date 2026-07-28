import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { clsx } from 'clsx'
import type { StatTone } from './StatCard'

const TONE_STYLES: Record<StatTone, string> = {
  ok: 'bg-green-500/10 text-green-300 border-green-500/20',
  warn: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-300 border-red-500/20',
  neutral: 'bg-gray-500/10 text-gray-300 border-gray-500/20',
}

const TONE_ICONS = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  danger: XCircle,
  neutral: Info,
}

interface StatusBadgeProps {
  tone: StatTone
  children: React.ReactNode
}

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  const Icon = TONE_ICONS[tone]
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
      TONE_STYLES[tone]
    )}>
      <Icon className="h-3 w-3" />
      {children}
    </span>
  )
}
