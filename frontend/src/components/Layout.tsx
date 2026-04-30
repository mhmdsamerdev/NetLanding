import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, List, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/entries', label: 'Entries', icon: List, exact: false },
  { to: '/settings', label: 'Settings', icon: Settings, exact: false },
]

export default function Layout() {
  return (
    <div className="flex h-full min-h-screen bg-[#0d0d0d]">
      <aside className="w-[220px] shrink-0 border-r border-white/[0.06] flex flex-col py-6 px-4 gap-1">
        <div className="mb-6 px-2">
          <span className="font-mono text-base font-medium text-emerald-400 tracking-tight">NetLanding</span>
          <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">income tracker</p>
        </div>
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              )
            }
          >
            <Icon size={15} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
