import { cn, formatCurrency } from '@/lib/utils'
import type { DashboardData } from '@/lib/api'

interface Stage {
  label: string
  amount: number
  count: number
  empty: string
  color: string // css var
  text: string // tailwind text class
}

export default function MoneyTimeline({ data }: { data: DashboardData }) {
  const cur = data.base_currency
  const sc = data.status_counts
  const stages: Stage[] = [
    { label: 'Pending on platform', amount: data.pending_net, count: sc.pending, empty: 'Nothing on hold', color: 'var(--color-lilac)', text: 'text-lilac' },
    { label: 'Available to withdraw', amount: data.available_net, count: sc.available, empty: 'Nothing ready', color: 'var(--color-sky)', text: 'text-sky' },
    { label: 'Withdrawal in transit', amount: data.withdrawn_net, count: sc.withdrawn, empty: 'Nothing on the way', color: 'var(--color-lilac)', text: 'text-lilac' },
    { label: 'Landed in bank', amount: data.in_bank_net, count: sc.in_bank, empty: 'Nothing landed yet', color: 'var(--color-gold)', text: 'text-gold' },
  ]
  const days = data.avg_days_earned_to_bank

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="font-display text-[22px] font-semibold text-ink">Where all your money sits right now</h2>
        {sc.in_bank > 0 && (
          <p className="text-[13px] text-muted">
            Earned to bank in <span className="font-bold text-ink">{days} {days === 1 ? 'day' : 'days'}</span> on average
          </p>
        )}
      </div>

      <ol className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-y-8">
        {stages.map(s => {
          const filled = s.count > 0
          return (
            <li key={s.label} className="relative pr-4">
              {/* connector to the next stage */}
              <span
                aria-hidden
                className={cn('absolute top-[10px] left-[10px] -right-0 hidden md:block', filled ? 'h-px' : 'border-t-2 border-dotted border-muted/40')}
                style={filled ? { background: s.color, opacity: 0.85 } : undefined}
              />
              <span className="relative z-10 flex h-5 w-5 items-center justify-center">
                <span
                  aria-hidden
                  className={cn('block rounded-full', filled ? 'w-5 h-5' : 'w-3 h-3 border-2 border-muted bg-bg')}
                  style={filled ? { background: s.color, boxShadow: '0 0 0 4px var(--color-bg)' } : undefined}
                />
              </span>
              <p className="mt-5 text-[13px] text-muted">{s.label}</p>
              <p className={cn('mt-1 font-display text-[28px] font-semibold tabular-nums', filled ? s.text : 'text-muted')}>
                {formatCurrency(s.amount, cur)}
              </p>
              <p className="mt-1 text-[13px] text-muted">
                {filled ? `${s.count} ${s.count === 1 ? 'entry' : 'entries'}` : s.empty}
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
