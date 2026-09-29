import { cn } from '@/lib/utils'
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'destructive' | 'accent'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
          {
            'bg-raised text-ink hover:bg-[#352f43] border border-line': variant === 'default',
            'hover:bg-white/[0.06] text-ink-2 hover:text-ink': variant === 'ghost',
            'border border-line text-ink-2 hover:bg-white/[0.06] bg-transparent': variant === 'outline',
            'bg-coral/15 text-salmon hover:bg-coral/25 border border-coral/25': variant === 'destructive',
            'bg-gold text-bg font-semibold hover:brightness-110': variant === 'accent',
          },
          {
            'h-7 px-2.5 text-xs': size === 'sm',
            'h-9 px-3.5 text-sm': size === 'md',
            'h-10 px-5 text-sm': size === 'lg',
            'h-8 w-8 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
