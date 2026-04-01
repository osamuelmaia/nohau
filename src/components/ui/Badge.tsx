import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' | 'orange'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  gray: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  orange: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

const dotClasses: Record<BadgeVariant, string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-amber-400',
  red: 'bg-red-400',
  blue: 'bg-blue-400',
  gray: 'bg-gray-400',
  purple: 'bg-purple-400',
  orange: 'bg-orange-400',
}

export function Badge({ className, variant = 'gray', dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotClasses[variant])} />}
      {children}
    </span>
  )
}

export default Badge
