import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface PopoverProps {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
  className?: string
  /** Panel is at least as wide as the anchor (default true). */
  matchWidth?: boolean
  role?: string
  id?: string
}

/** Portal-rendered panel anchored under (or above, if no room) an element. */
export function Popover({ open, anchorRef, onClose, children, className, matchWidth = true, role, id }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number; maxHeight: number } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const a = anchorRef.current
      const p = panelRef.current
      if (!a) return
      const r = a.getBoundingClientRect()
      const ph = p?.offsetHeight ?? 0
      const pw = p?.offsetWidth ?? 0
      const below = window.innerHeight - r.bottom - 8
      const above = r.top - 8
      const up = ph > below && above > below
      const maxHeight = Math.max(160, up ? above : below)
      const height = Math.min(ph, maxHeight)
      const top = up ? r.top - height - 4 : r.bottom + 4
      const left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8))
      setPos({ top, left, minWidth: matchWidth ? r.width : 0, maxHeight })
    }
    place()
    const raf = requestAnimationFrame(place)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchorRef, matchWidth])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return
      onClose()
    }
    // Capture on window so Esc closes only the popover, not the drawer/dialog behind it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.stopImmediatePropagation()
        onClose()
      }
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open, anchorRef, onClose])

  if (!open) return null
  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role={role}
      style={{
        position: 'fixed',
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        minWidth: pos?.minWidth,
        maxHeight: pos?.maxHeight,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className={cn('z-[60] bg-surface border border-line rounded-xl shadow-2xl shadow-black/50 overflow-y-auto', className)}
    >
      {children}
    </div>,
    document.body
  )
}
