'use client'

import { clsx } from 'clsx'

export function RedirectStatusBadge({ active }: { active: boolean }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border',
      active
        ? 'bg-green-500/10 text-green-400 border-green-500/20'
        : 'bg-[#2a2d3e] text-[#94a3b8] border-[#3a3d4e]'
    )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', active ? 'bg-green-400' : 'bg-[#6b7280]')} />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}
