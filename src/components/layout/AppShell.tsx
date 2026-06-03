import { type ReactNode } from 'react'
import { BottomNav } from './BottomNav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-garage-cream font-body">
      <main className="pb-16 sm:pb-0 max-w-2xl mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
