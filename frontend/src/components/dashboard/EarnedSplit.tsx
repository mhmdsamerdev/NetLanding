import type { DashboardData } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export default function EarnedSplit({ data }: { data: DashboardData }) {
  const cur = data.base_currency
  const gross = data.total_gross_all_time
  const kept = data.total_net_all_time
  const lost = data.total_fees_all_time
  const keptPct = gross > 0 ? (kept / gross) * 100 : 0

  return (
    <section className="border-t border-line pt-9 flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
      <div className="flex-1 min-w-[320px]">
        <h2 className="font-display text-[26px] font-semibold text-ink">
          {gross > 0
            ? <>Of every $100 you've earned, ${keptPct.toFixed(2)} reached you.</>
            : <>Nothing earned yet.</>}
        </h2>
        <div className="mt-5 flex h-3 gap-[3px]">
          {gross > 0 ? (
            <>
              <div className="h-full rounded-l-full rounded-r-[3px] bg-gold" style={{ width: `${keptPct}%` }} />
              {lost > 0 && <div className="h-full rounded-r-full rounded-l-[3px] bg-coral" style={{ width: `${100 - keptPct}%` }} />}
            </>
          ) : (
            <div className="h-full w-full rounded-full bg-white/[0.06]" />
          )}
        </div>
      </div>
      <dl className="flex gap-10">
        {[
          { label: 'Earned', value: gross, cls: 'text-ink' },
          { label: 'Kept', value: kept, cls: 'text-gold' },
          { label: 'Lost to fees', value: lost, cls: 'text-salmon' },
        ].map(s => (
          <div key={s.label}>
            <dt className="text-[13px] text-muted">{s.label}</dt>
            <dd className={`mt-1 font-display text-2xl font-semibold tabular-nums ${s.cls}`}>{formatCurrency(s.value, cur)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
