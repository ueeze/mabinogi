'use client'

import { useEffect } from 'react'
import { loadSession } from '@/lib/session'
import { ensureThisWeekDashboard } from '@/lib/dashboard'

export default function EnsureDashboard() {
  useEffect(() => {
    const run = async () => {
      const session = loadSession()
      if (!session?.userId) return

      try {
        await ensureThisWeekDashboard(session.userId)
      } catch (e) {
        console.error(e)
      }
    }

    run()
  }, [])

  return null
}
