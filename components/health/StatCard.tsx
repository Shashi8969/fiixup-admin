import type { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

export type StatTone = 'ok' | 'warn' | 'danger' | 'neutral'

const TONE_CLASSES: Record<StatTone, string> = {
  ok: 'text-green-400',
  warn: 'text-amber-400',
  danger: 'text-red-400',
  neutral: 'text-white',
}

interface StatCardProps {
  label: string
  value: string | number
  helper?: string
  icon?: LucideIcon
  tone?: StatTone
  onClick?: () => void
}

export function StatCard({ label, value, helper, icon: Icon, tone = 'neutral', onClick }: StatCardProps) {
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={clsx(
        'admin-card p-4 text-center',
        onClick && 'w-full transition-colors hover:border-blue-500/40'
      )}
    >
      {Icon && <Icon className={clsx('mx-auto mb-1.5 h-5 w-5', TONE_CLASSES[tone])} />}
      <p className={clsx('text-2xl font-extrabold', TONE_CLASSES[tone])}>{value}</p>
      <p className="mt-0.5 text-xs text-[#6b7280]">{label}</p>
      {helper && <p className="mt-0.5 text-[11px] text-[#475569]">{helper}</p>}
    </Wrapper>
  )
}
