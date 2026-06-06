'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import type { ActionResult } from '@/lib/actions'

export function useBufferedTableUpdate<T extends Record<string, unknown>>({
  table,
  idColumn = 'id',
  idValue,
  setLocal,
  delay = 900,
  enabled = true,
}: {
  table: string
  idColumn?: string
  idValue: string | number | null | undefined
  setLocal?: React.Dispatch<React.SetStateAction<T | null>>
  delay?: number
  enabled?: boolean
}) {
  const [saving, setSaving] = useState(false)
  const [queued, setQueued] = useState(false)
  const pendingRef = useRef<Record<string, unknown>>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async (): Promise<ActionResult> => {
    if (!enabled || !idValue) return { success: false, error: 'Missing row id' }
    const patch = pendingRef.current
    if (Object.keys(patch).length === 0) return { success: true, message: 'Nothing to save' }

    pendingRef.current = {}
    setQueued(false)
    setSaving(true)

    const { error } = await getBrowserClient()
      .from(table)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq(idColumn, idValue)

    setSaving(false)
    if (error) return { success: false, error: error.message }
    return { success: true, message: 'Saved' }
  }, [enabled, idColumn, idValue, table])

  const queueSave = useCallback(async (patch: Record<string, unknown>): Promise<ActionResult> => {
    if (!enabled || !idValue) return { success: false, error: 'Missing row id' }

    pendingRef.current = { ...pendingRef.current, ...patch }
    setLocal?.((prev) => (prev ? ({ ...prev, ...patch } as T) : prev))
    setQueued(true)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void flush() }, delay)

    return { success: true, message: 'Queued — auto-save running' }
  }, [delay, enabled, flush, idValue, setLocal])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (Object.keys(pendingRef.current).length > 0) void flush()
    }
  }, [flush])

  return { queueSave, flush, saving, queued }
}
