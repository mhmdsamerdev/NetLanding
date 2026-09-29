import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MONTHS_LONG, MONTHS_SHORT, WEEKDAYS, monthMatrix, parseISO, todayISO } from '@/lib/date'

interface CalendarProps {
  /** Currently chosen date (ISO) or ''. */
  selected: string
  /** Keyboard/view cursor (ISO); determines the visible month. */
  cursor: string
  onCursorChange: (iso: string) => void
  onPick: (iso: string) => void
  onClear?: () => void
  min?: string
  max?: string
}

export function Calendar({ selected, cursor, onCursorChange, onPick, onClear, min, max }: CalendarProps) {
  const [view, setView] = useState<'days' | 'months'>('days')
  const today = todayISO()
  const c = parseISO(cursor) ?? parseISO(today)!
  const disabled = (iso: string) => (!!min && iso < min) || (!!max && iso > max)

  const shiftMonth = (delta: number) => {
    const first = new Date(c.y, c.m + delta, 1)
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    onCursorChange(`${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-${String(Math.min(c.d, last)).padStart(2, '0')}`)
  }
  const setMonthYear = (y: number, m: number) => {
    const last = new Date(y, m + 1, 0).getDate()
    onCursorChange(`${y}-${String(m + 1).padStart(2, '0')}-${String(Math.min(c.d, last)).padStart(2, '0')}`)
  }

  const navBtn = 'h-7 w-7 rounded-full flex items-center justify-center text-ink-2 hover:bg-white/[0.07] hover:text-ink transition-colors'

  return (
    <div className="w-[264px] p-3 select-none" onMouseDown={e => e.preventDefault()}>
      <div className="flex items-center justify-between mb-2">
        <button type="button" className={navBtn} onClick={() => (view === 'days' ? shiftMonth(-1) : setMonthYear(c.y - 1, c.m))} aria-label="Previous">
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          onClick={() => setView(v => (v === 'days' ? 'months' : 'days'))}
          className="px-2.5 h-7 rounded-full text-sm font-medium text-ink hover:bg-white/[0.07] transition-colors"
        >
          {view === 'days' ? `${MONTHS_LONG[c.m]} ${c.y}` : c.y}
        </button>
        <button type="button" className={navBtn} onClick={() => (view === 'days' ? shiftMonth(1) : setMonthYear(c.y + 1, c.m))} aria-label="Next">
          <ChevronRight size={15} />
        </button>
      </div>

      {view === 'months' ? (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {MONTHS_SHORT.map((name, m) => (
            <button
              key={name}
              type="button"
              onClick={() => { setMonthYear(c.y, m); setView('days') }}
              className={cn(
                'h-9 rounded-lg text-sm transition-colors',
                m === c.m ? 'bg-gold text-bg font-medium' : 'text-ink-2 hover:bg-white/[0.07] hover:text-ink'
              )}
            >
              {name}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="h-7 flex items-center justify-center text-[11px] uppercase tracking-wide text-muted">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {monthMatrix(c.y, c.m).map(iso => {
              const p = parseISO(iso)!
              const inMonth = p.m === c.m
              const isSel = iso === selected
              const isCursor = iso === cursor
              const dis = disabled(iso)
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={dis}
                  onClick={() => onPick(iso)}
                  className={cn(
                    'h-8 w-8 mx-auto rounded-full text-[13px] tabular-nums flex items-center justify-center transition-colors',
                    isSel ? 'bg-gold text-bg font-semibold'
                      : dis ? 'text-muted/30 cursor-not-allowed'
                      : inMonth ? 'text-ink hover:bg-white/[0.09]' : 'text-muted/60 hover:bg-white/[0.06]',
                    !isSel && iso === today && !dis && 'ring-1 ring-gold/60 text-gold',
                    !isSel && isCursor && !dis && 'bg-white/[0.09]'
                  )}
                >
                  {p.d}
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-line">
        <button
          type="button"
          disabled={disabled(today)}
          onClick={() => onPick(today)}
          className="text-xs text-gold hover:text-gold/80 px-2 py-1 rounded-md hover:bg-white/5 transition-colors disabled:opacity-40"
        >
          Today
        </button>
        {onClear && (
          <button type="button" onClick={onClear} className="text-xs text-muted hover:text-ink-2 px-2 py-1 rounded-md hover:bg-white/5 transition-colors">
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
