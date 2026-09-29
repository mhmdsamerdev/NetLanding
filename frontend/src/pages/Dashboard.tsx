import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { dashboardApi, sourcesApi } from '@/lib/api'
import type { DashboardData, Source } from '@/lib/api'
import { Button } from '@/components/ui/button'
import EntryModal from '@/components/EntryModal'
import FlowSankey from '@/components/dashboard/FlowSankey'
import MoneyTimeline from '@/components/dashboard/MoneyTimeline'
import WaitingToWithdraw from '@/components/dashboard/WaitingToWithdraw'
import SourceBreakdown from '@/components/dashboard/SourceBreakdown'
import EarnedSplit from '@/components/dashboard/EarnedSplit'
import { formatCurrency, formatDate, formatMoney } from '@/lib/utils'

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + delta, 1))
}

function monthLabel(key: string, withYear = true) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-US', withYear ? { month: 'long', year: 'numeric' } : { month: 'long' })
}

function Hero({ data, isCurrent }: { data: DashboardData; isCurrent: boolean }) {
  const cur = data.base_currency
  const earned = data.gross_this_month
  const when = isCurrent ? 'this month' : `in ${monthLabel(data.month, false)}`
  const ready = data.month_available_net
  const onWay = data.month_pending_net + data.month_withdrawn_net
  const fees = data.fees_this_month

  let headline: string
  if (data.month_entry_count === 0) {
    headline = isCurrent ? 'No income logged this month yet.' : `No income was logged in ${monthLabel(data.month)}.`
  } else if (data.month_in_bank_net <= 0) {
    headline = `None of the ${formatMoney(earned, cur)} you earned ${when} has landed in your bank yet.`
  } else {
    headline = `${formatMoney(data.month_in_bank_net, cur)} of the ${formatMoney(earned, cur)} you earned ${when} has landed in your bank.`
  }

  const sub: string[] = []
  if (ready > 0) sub.push(`${formatMoney(ready, cur)} is sitting${data.month_ready_source ? ` on ${data.month_ready_source}` : ''}, ready to withdraw.`)
  if (onWay > 0) sub.push(`${formatMoney(onWay, cur)} is still on its way.`)
  if (fees > 0) sub.push(`Fees took ${formatMoney(fees, cur)} before any of it moved.`)

  return (
    <header className="mt-14 max-w-3xl">
      <h1 className="font-display text-[44px] leading-[1.06] font-semibold text-ink text-balance">{headline}</h1>
      {sub.length > 0 && <p className="mt-4 text-lg text-ink-2/80">{sub.join(' ')}</p>}
      {data.month_entry_count === 0 && (
        <p className="mt-4 text-lg text-ink-2/80">Use "Log income" to add an entry, or browse another month.</p>
      )}
    </header>
  )
}

export default function Dashboard() {
  const nowKey = monthKey(new Date())
  const [month, setMonth] = useState(nowKey)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(() => {
    dashboardApi.get(month)
      .then(r => { setData(r.data); setError(false) })
      .catch(() => setError(true))
  }, [month])

  useEffect(() => { load() }, [load])
  useEffect(() => { sourcesApi.list().then(r => setSources(r.data)).catch(() => {}) }, [])

  if (error && !data) {
    return <div className="flex items-center justify-center h-full text-salmon text-sm">Failed to load the dashboard.</div>
  }
  if (!data) {
    return <div className="flex items-center justify-center h-full text-muted text-sm">Loading…</div>
  }

  const isCurrent = month === nowKey
  const cur = data.base_currency
  const onWay = data.month_pending_net + data.month_withdrawn_net
  const stale = data.month !== month

  return (
    <div className="px-6 md:px-14 py-10 max-w-[1240px] mx-auto pb-24">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            aria-label="Previous month"
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="w-11 h-11 rounded-full border border-line text-ink-2 hover:text-ink hover:bg-white/[0.05] transition-colors flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="font-display text-2xl font-semibold text-ink min-w-[200px] text-center">{monthLabel(month)}</h2>
          <button
            aria-label="Next month"
            disabled={isCurrent}
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="w-11 h-11 rounded-full border border-line text-ink-2 hover:text-ink hover:bg-white/[0.05] transition-colors flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <Button variant="accent" size="lg" className="h-11 px-6 text-sm" onClick={() => setModalOpen(true)}>
          <Plus size={16} strokeWidth={2.25} />
          Log income
        </Button>
      </div>

      <div className={stale ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        <Hero data={data} isCurrent={isCurrent} />

        {data.expiry_warnings.length > 0 && (
          <div className="mt-6 max-w-3xl rounded-2xl border border-gold/25 bg-gold/[0.07] px-5 py-4 flex gap-3 text-sm">
            <AlertTriangle size={16} className="text-gold mt-0.5 shrink-0" />
            <div className="flex-1 text-ink-2">
              <p className="text-ink font-medium">Expiring within 30 days</p>
              <ul className="mt-1 space-y-0.5">
                {data.expiry_warnings.map((w, i) => (
                  <li key={i}>{w.label}: {formatCurrency(w.net, w.currency)} expires {formatDate(w.date)}</li>
                ))}
              </ul>
            </div>
            <Link to="/entries" className="text-gold hover:underline whitespace-nowrap self-start">Review entries</Link>
          </div>
        )}

        {data.month_entry_count > 0 && (
          <div className="mt-12">
            <FlowSankey
              currency={cur}
              gross={data.gross_this_month}
              net={data.net_this_month}
              platformFees={data.month_platform_fees}
              withdrawalFees={data.month_withdrawal_fees}
              entryCount={data.month_entry_count}
              inBank={data.month_in_bank_net}
              ready={data.month_available_net}
              onTheWay={onWay}
            />
          </div>
        )}

        <div className="mt-16"><MoneyTimeline data={data} /></div>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-8 items-start">
          <WaitingToWithdraw data={data} onChanged={load} />
          <SourceBreakdown data={data} />
        </div>

        <div className="mt-14"><EarnedSplit data={data} /></div>
      </div>

      <EntryModal
        open={modalOpen}
        entry={null}
        initialSources={sources}
        onClose={() => setModalOpen(false)}
        onSaved={() => { sourcesApi.list().then(r => setSources(r.data)).catch(() => {}); load() }}
      />
    </div>
  )
}
