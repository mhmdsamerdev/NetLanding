import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, List, Settings, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { settingsApi } from '@/lib/api'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/entries', label: 'Entries', icon: List, exact: false },
  { to: '/settings', label: 'Settings', icon: Settings, exact: false },
]

function workingDaysLeft(now: Date): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  let n = 0
  for (let d = now.getDate() + 1; d <= last; d++) {
    const dow = new Date(now.getFullYear(), now.getMonth(), d).getDay()
    if (dow !== 0 && dow !== 6) n++
  }
  return n
}

export default function Layout() {
  const [currency, setCurrency] = useState('USD')
  useEffect(() => {
    settingsApi.get().then(r => setCurrency(r.data.base_currency)).catch(() => {})
  }, [])

  const now = new Date()
  const left = workingDaysLeft(now)
  const monthName = now.toLocaleString('en-US', { month: 'long' })

  return (
    <div className="flex h-full min-h-screen bg-bg">
      <aside className="w-[232px] shrink-0 bg-surface/60 flex flex-col px-5 py-8 sticky top-0 h-screen">
        <div className="mb-8 px-3 flex items-center gap-2.5">
          <TrendingDown size={20} strokeWidth={2} className="text-salmon" />
          <span className="font-display text-xl font-semibold text-ink">NetLanding</span>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                  isActive ? 'bg-raised text-ink' : 'text-ink-2 hover:text-ink hover:bg-white/[0.04]'
                )
              }
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-line pt-4 px-1 text-xs leading-relaxed text-muted">
          <p>Showing amounts in {currency}</p>
          <p>
            {left === 0 ? 'No working days' : `${left} working ${left === 1 ? 'day' : 'days'}`} left in {monthName}
          </p>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
