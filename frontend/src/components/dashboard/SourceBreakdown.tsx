import type { DashboardData } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'

export default function SourceBreakdown({ data }: { data: DashboardData }) {
  const cur = data.base_currency
  const sources = [...data.per_source_breakdown].sort((a, b) => b.total_gross - a.total_gross)
  const max = Math.max(...sources.map(s => s.total_gross), 1)

  return (
    <section className="bg-surface rounded-card p-7">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-ink">What each source leaves you</h2>
        <span className="text-[13px] text-muted whitespace-nowrap">All time</span>
      </div>

      {sources.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Log some income to see how each source performs.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-6">
          {sources.map(s => {
            const netW = (Math.max(s.total_net, 0) / max) * 100
            const feeW = (Math.max(s.total_fees, 0) / max) * 100
            return (
              <li key={s.source_name}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] text-ink truncate">{s.source_name}</span>
                  <span className="text-[13px] text-muted whitespace-nowrap tabular-nums">
                    <b className="text-ink font-semibold">{formatCurrency(s.total_net, cur)}</b> of {formatCurrency(s.total_gross, cur)}
                  </span>
                </div>
                <div className="mt-2.5 flex h-2.5 rounded-full overflow-hidden bg-white/[0.04]">
                  <div className="h-full bg-lilac" style={{ width: `${netW}%` }} />
                  {feeW > 0 && <div className="h-full bg-coral" style={{ width: `${Math.max(feeW, 0.8)}%` }} />}
                </div>
                <p className={cn('mt-2 text-[13px]', s.fee_pct > 0 ? 'text-salmon' : 'text-muted')}>
                  {s.fee_pct > 0 ? `${s.fee_pct}% to fees` : 'No fees'}, {s.entry_count} {s.entry_count === 1 ? 'entry' : 'entries'}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
