import type { ReactNode } from 'react'
import AppShell from '../../components/AppShell'
import EnsureDashboard from '../../components/EnsureDashboard'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <EnsureDashboard />
      {children}
    </AppShell>
  )
}
