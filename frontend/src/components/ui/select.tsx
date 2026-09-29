import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover } from './popover'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function Select({ value, onChange, options, placeholder, disabled, className }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const btnRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const typed = useRef({ text: '', t: 0 })
  const listId = useId()

  const selectedIdx = options.findIndex(o => o.value === value)
  const selected = selectedIdx >= 0 ? options[selectedIdx] : undefined

  const close = useCallback(() => setOpen(false), [])
  const openList = () => { setActive(Math.max(0, selectedIdx)); setOpen(true) }
  const pick = (i: number) => {
    const o = options[i]
    if (o) onChange(o.value)
    setOpen(false)
    btnRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    const n = options.length
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList() }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(n - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(n - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active) }
    else if (e.key === 'Tab') setOpen(false)
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const now = Date.now()
      typed.current.text = (now - typed.current.t > 700 ? '' : typed.current.text) + e.key.toLowerCase()
      typed.current.t = now
      const idx = options.findIndex(o => o.label.toLowerCase().replace(/^[—\s-]+/, '').startsWith(typed.current.text))
      if (idx >= 0) setActive(idx)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          'w-full h-9 rounded-md bg-raised border border-line px-3 text-sm text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold/50 transition-colors disabled:opacity-50 cursor-pointer',
          open && 'border-gold/50 ring-1 ring-gold',
          className
        )}
      >
        <span className={cn('truncate', selected ? 'text-ink' : 'text-muted')}>{selected?.label ?? placeholder ?? ''}</span>
        <ChevronDown size={14} className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      <Popover open={open} anchorRef={btnRef} onClose={close} className="p-1">
        <div ref={listRef} id={listId} role="listbox">
          {options.map((o, i) => (
            <div
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              data-idx={i}
              onMouseEnter={() => setActive(i)}
              onMouseDown={e => e.preventDefault()}
              onClick={() => pick(i)}
              className={cn(
                'flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-md text-sm cursor-pointer whitespace-nowrap',
                i === active ? 'bg-white/[0.07] text-ink' : 'text-ink-2',
                o.value === value && 'text-ink'
              )}
            >
              <span>{o.label}</span>
              {o.value === value && <Check size={13} className="text-gold shrink-0" />}
            </div>
          ))}
        </div>
      </Popover>
    </>
  )
}
