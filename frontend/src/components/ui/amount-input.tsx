import { useState } from 'react'
import { cn } from '@/lib/utils'

interface AmountInputProps {
  value: number
  onChange: (n: number) => void
  placeholder?: string
  suffix?: string
  className?: string
}

/** Decimal-only text input (no native spinners / wheel changes / negatives). */
export function AmountInput({ value, onChange, placeholder, suffix, className }: AmountInputProps) {
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(false)
  const shown = editing ? text : value ? String(value) : ''

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    let t = e.target.value.replace(/,/g, '.').replace(/[^\d.]/g, '')
    const dot = t.indexOf('.')
    if (dot >= 0) t = t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, '').slice(0, 2)
    setText(t)
    onChange(parseFloat(t) || 0)
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={shown}
        placeholder={placeholder}
        onChange={handle}
        onFocus={() => { setText(value ? String(value) : ''); setEditing(true) }}
        onBlur={() => setEditing(false)}
        className={cn(
          'w-full h-9 rounded-md bg-raised border border-line px-3 text-sm text-ink tabular-nums placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold/50 transition-colors',
          suffix && 'pr-12',
          className
        )}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted pointer-events-none">{suffix}</span>}
    </div>
  )
}
