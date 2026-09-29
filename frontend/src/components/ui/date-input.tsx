import { useCallback, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addDays, addMonths, displayToISO, isoToDisplay, maskDate, todayISO } from '@/lib/date'
import { Calendar } from './calendar'
import { Popover } from './popover'

interface DateInputProps {
  /** ISO YYYY-MM-DD, '' or null for empty. */
  value: string | null | undefined
  /** Called with ISO date, or '' when cleared. */
  onChange: (iso: string) => void
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DateInput({ value, onChange, min, max, placeholder = 'DD/MM/YYYY', disabled, className }: DateInputProps) {
  const iso = value ?? ''
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const text = editing ? draft : isoToDisplay(iso)
  const setText = (t: string) => { setDraft(t); setEditing(true) }
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(iso || todayISO())
  const [invalid, setInvalid] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const outOfRange = (d: string) => (!!min && d < min) || (!!max && d > max)
  const close = useCallback(() => setOpen(false), [])

  const commit = (d: string) => {
    if (outOfRange(d)) return false
    onChange(d)
    setText(isoToDisplay(d))
    setCursor(d)
    setInvalid(false)
    return true
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskDate(e.target.value)
    setText(masked)
    if (masked === '') { setInvalid(false); onChange(''); return }
    if (masked.length < 10) { setInvalid(false); return }
    const d = displayToISO(masked)
    if (d && !outOfRange(d)) { setInvalid(false); onChange(d); setCursor(d) }
    else setInvalid(true)
  }

  const handleBlur = () => {
    // Anything not a complete valid date snaps back to the last committed value.
    setEditing(false)
    setInvalid(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const move = (d: string) => {
      if (!min && !max) return setCursor(d)
      if (!outOfRange(d)) setCursor(d)
    }
    if (open) {
      const step: Record<string, () => void> = {
        ArrowLeft: () => move(addDays(cursor, -1)),
        ArrowRight: () => move(addDays(cursor, 1)),
        ArrowUp: () => move(addDays(cursor, -7)),
        ArrowDown: () => move(addDays(cursor, 7)),
        PageUp: () => move(addMonths(cursor, -1)),
        PageDown: () => move(addMonths(cursor, 1)),
      }
      if (step[e.key]) { e.preventDefault(); step[e.key](); return }
      if (e.key === 'Enter') { e.preventDefault(); if (commit(cursor)) setOpen(false); return }
      if (e.key === 'Tab') setOpen(false)
    } else {
      if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); setOpen(true); return }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const dir = e.key === 'ArrowUp' ? 1 : -1
        const base = iso || todayISO()
        commit(e.shiftKey ? addMonths(base, dir) : addDays(base, dir))
        return
      }
      if (e.key === 'Enter') {
        const d = displayToISO(text)
        if (d) commit(d)
        else setOpen(true)
        return
      }
    }
    if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      commit(todayISO())
    }
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={() => { setDraft(isoToDisplay(iso)); setEditing(true); setCursor(iso || todayISO()) }}
        onClick={() => setOpen(true)}
        aria-invalid={invalid || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'w-full h-9 rounded-md bg-raised border border-line pl-3 pr-9 text-sm text-ink tabular-nums placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold/50 transition-colors disabled:opacity-50',
          invalid && 'border-coral/70 focus:ring-coral focus:border-coral/70',
          open && !invalid && 'border-gold/50 ring-1 ring-gold'
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-label="Open calendar"
        onMouseDown={e => e.preventDefault()}
        onClick={() => { inputRef.current?.focus(); setOpen(o => !o) }}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded flex items-center justify-center text-muted hover:text-gold transition-colors disabled:opacity-50"
      >
        <CalendarDays size={14} />
      </button>
      <Popover open={open} anchorRef={wrapRef} onClose={close} matchWidth={false} role="dialog">
        <Calendar
          selected={iso}
          cursor={cursor}
          onCursorChange={setCursor}
          min={min}
          max={max}
          onPick={d => { if (commit(d)) setOpen(false) }}
          onClear={iso ? () => { onChange(''); setText(''); setInvalid(false); setOpen(false) } : undefined}
        />
      </Popover>
    </div>
  )
}
