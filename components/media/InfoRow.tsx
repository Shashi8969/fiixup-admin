import { clsx } from 'clsx'

export function InfoRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] text-[#6b7280] font-semibold uppercase tracking-wider">{label}</p>
      <p className={clsx('text-xs text-[#e2e8f0] mt-0.5 break-all', mono && 'font-mono text-[#6b7280]')}>{value}</p>
    </div>
  )
}
