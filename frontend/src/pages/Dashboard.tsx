import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, Banknote } from 'lucide-react'
import { dashboardApi } from '@/lib/api'
import type { DashboardData } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">{label}</p>
      <p className={`font-mono text-2xl font-medium ${accent ? 'text-emerald-400' : 'text-zinc-100'}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function PipelineSegment({ label, amount, currency, sub, color }: {
  label: string; amount: number; currency: string; sub?: string; color: string
}) {
  return (
    <div className={`flex-1 px-4 py-3 ${color}`}>
      <p className="text-[10px] font-medium mb-1 uppercase tracking-wider opacity-80">{label}</p>
      <p className="font-mono text-base font-medium">{formatCurrency(amount, currency)}</p>
      {sub && <p className="text-[10px] mt-0.5 opacity-60">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    dashboardApi.get().then(r => { setData(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
        Loading dashboard…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        Failed to load dashboard. Is the backend running?
      </div>
    )
  }

  const cur = data.base_currency
  const now = new Date()
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const workingDaysLeft = Math.round((daysInMonth - now.getDate()) * 5 / 7)

  const feePercent = data.gross_this_month > 0
    ? ((data.fees_this_month / data.gross_this_month) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">{monthName}</p>
          <p className="text-sm text-zinc-500 mt-0.5">{workingDaysLeft} working days left this month</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          live
        </span>
      </div>

      {/* Hero metrics */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Cleared in bank this month"
          value={formatCurrency(data.cleared_this_month, cur)}
          sub="actually yours"
          accent
        />
        <StatCard
          label="Total earned (gross) this month"
          value={formatCurrency(data.gross_this_month, cur)}
          sub="this month"
        />
      </div>

      {/* Pipeline */}
      <div className="bg-[#161616] border border-white/[0.07] rounded-xl overflow-hidden">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 px-4 pt-4 pb-2">Money in motion</p>
        <div className="flex divide-x divide-white/[0.06]">
          <PipelineSegment
            label="Pending"
            amount={data.pending_net}
            currency={cur}
            color="text-amber-400"
          />
          <div className="flex items-center text-zinc-700 px-1 shrink-0">›</div>
          <PipelineSegment
            label="Available"
            amount={data.available_net}
            currency={cur}
            sub="ready to withdraw"
            color="text-sky-400"
          />
          <div className="flex items-center text-zinc-700 px-1 shrink-0">›</div>
          <PipelineSegment
            label="Withdrawn"
            amount={data.withdrawn_net}
            currency={cur}
            color="text-indigo-400"
          />
          <div className="flex items-center text-zinc-700 px-1 shrink-0">›</div>
          <PipelineSegment
            label="In Bank"
            amount={data.in_bank_net}
            currency={cur}
            color="text-emerald-400"
          />
        </div>
      </div>

      {/* Expiry warnings */}
      {data.expiry_warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/20 rounded-lg px-4 py-3">
          <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-amber-300 font-medium">
              <span className="text-amber-200">{w.label}</span>
              {' '}({formatCurrency(w.net, w.currency)}) expires on{' '}
              {new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
              {' '}Withdraw or use it before it lapses.
            </p>
            <button
              onClick={() => navigate('/entries')}
              className="text-[11px] text-amber-500 underline underline-offset-2 mt-1 hover:text-amber-400 transition-colors"
            >
              Review entries ↗
            </button>
          </div>
        </div>
      ))}

      {/* Fees card */}
      <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Fees eroding this month</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-2xl font-medium text-red-400">{formatCurrency(data.fees_this_month, cur)}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{feePercent}% of gross lost to fees</p>
          </div>
        </div>
        <div className="border-t border-white/[0.06] mt-3 pt-3 flex gap-5 text-xs text-zinc-500">
          <span>Platform fees <span className="font-mono text-zinc-300 ml-1">{formatCurrency(data.platform_fees_this_month, cur)}</span></span>
          <span>Withdrawal fees <span className="font-mono text-zinc-300 ml-1">{formatCurrency(data.withdrawal_fees_this_month, cur)}</span></span>
        </div>
      </div>

      {/* All-time + avg days row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="All-time gross" value={formatCurrency(data.total_gross_all_time, cur)} />
        <StatCard label="All-time net" value={formatCurrency(data.total_net_all_time, cur)} accent />
        <StatCard label="All-time fees" value={formatCurrency(data.total_fees_all_time, cur)} />
      </div>

      {/* Avg days + per-source breakdown row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Avg days to clear */}
        <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
            <Clock size={11} className="inline mr-1" />
            Avg. days earned → bank
          </p>
          <div className="flex items-end gap-4">
            <div>
              <p className="font-mono text-2xl font-medium text-zinc-100">{data.avg_days_to_clear}d</p>
              <p className="text-xs text-zinc-500">all sources</p>
            </div>
            <div className="space-y-1">
              {data.avg_days_per_source.map(s => (
                <p key={s.source_name} className="text-xs text-zinc-500">
                  {s.source_name} <span className="font-mono text-zinc-300 ml-1">{s.avg_days}d</span>
                </p>
              ))}
              {data.avg_days_per_source.length === 0 && (
                <p className="text-xs text-zinc-600">No cleared entries yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Per-source breakdown */}
        <div className="bg-[#161616] border border-white/[0.07] rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
            <Banknote size={11} className="inline mr-1" />
            Per-source breakdown
          </p>
          {data.per_source_breakdown.length === 0 ? (
            <p className="text-xs text-zinc-600">No entries yet</p>
          ) : (
            <div className="space-y-2">
              {data.per_source_breakdown.map(s => (
                <div key={s.source_name} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{s.source_name}</span>
                  <div className="text-right">
                    <p className="font-mono text-zinc-200">{formatCurrency(s.total_net, cur)}</p>
                    <p className="text-zinc-600">{s.entry_count} {s.entry_count === 1 ? 'entry' : 'entries'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending', count: data.status_counts.pending, color: 'text-amber-400' },
          { label: 'Available', count: data.status_counts.available, color: 'text-sky-400' },
          { label: 'Withdrawn', count: data.status_counts.withdrawn, color: 'text-indigo-400' },
          { label: 'In Bank', count: data.status_counts.in_bank, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#161616] border border-white/[0.07] rounded-xl p-3 text-center">
            <p className={`font-mono text-2xl font-medium ${s.color}`}>{s.count}</p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
