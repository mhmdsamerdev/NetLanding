import { useState } from 'react'
import { entriesApi } from '@/lib/api'
import type { DashboardData, Entry } from '@/lib/api'
import StatusPopover from '@/components/StatusPopover'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn, formatCurrency } from '@/lib/utils'

const OVERDUE_DAYS = 30
const BAR_FULL_DAYS = 50

interface Props {
  data: DashboardData
  onChanged: () => void
}

export default function WaitingToWithdraw({ data, onChanged }: Props) {
  const { toast } = useToast()
  const [busyId, setBusyId] = useState<number | null>(null)
  const [target, setTarget] = useState<{ entry: Entry; anchor: HTMLElement } | null>(null)
  const cur = data.base_currency
  const total = data.available_entries.reduce((a, e) => a + e.amount, 0)

  // Same step as moving Available → Withdrawn from the entries table: asks for bank, fee and date.
  async function markWithdrawn(id: number, anchor: HTMLElement) {
    if (target?.entry.id === id) { setTarget(null); return }
    setBusyId(id)
    try {
      const r = await entriesApi.get(id)
      setTarget({ entry: r.data, anchor })
    } catch {
      toast('Could not load the entry', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="bg-surface rounded-card p-7 flex flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-ink">Waiting for you to withdraw</h2>
        {data.available_entries.length > 0 && (
          <span className="text-[13px] text-muted whitespace-nowrap">{formatCurrency(total, cur)} total</span>
        )}
      </div>

      {data.available_entries.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Nothing is waiting. Everything available has been withdrawn.</p>
      ) : (
        <ul className="mt-5 divide-y divide-line border-t border-line">
          {data.available_entries.map(e => {
            const overdue = e.days_available >= OVERDUE_DAYS
            const pct = Math.min(e.days_available / BAR_FULL_DAYS, 1) * 100
            return (
              <li key={e.id} className="flex items-center gap-4 py-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-ink truncate">{e.title}</p>
                  <p className={cn('mt-1 text-[13px] truncate', overdue ? 'text-salmon' : 'text-muted')}>
                    {e.source_name}, available for {e.days_available} {e.days_available === 1 ? 'day' : 'days'}
                  </p>
                  <div className="mt-2.5 h-[3px] w-44 max-w-full rounded-full bg-white/[0.08]">
                    <div
                      className={cn('h-full rounded-full', overdue ? 'bg-salmon' : 'bg-sky')}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
                <span className="font-display text-[22px] font-semibold text-sky tabular-nums whitespace-nowrap">
                  {formatCurrency(e.amount, cur)}
                </span>
                <Button
                  variant="outline"
                  size="md"
                  className="h-11 w-[100px] px-3 text-[13px] leading-tight text-center whitespace-normal"
                  disabled={busyId === e.id}
                  onClick={ev => markWithdrawn(e.id, ev.currentTarget)}
                >
                  Mark withdrawn
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      {target && (
        <StatusPopover
          key={target.entry.id}
          entry={target.entry}
          anchor={target.anchor}
          onClose={() => setTarget(null)}
          onSaved={onChanged}
        />
      )}
    </section>
  )
}
