import Badge from './Badge'
import { getStatusColor, getStatusLabel, StatusColor } from '@/lib/utils'
import type { BadgeVariant } from './Badge'

interface StatusBadgeProps {
  status: string
  dot?: boolean
}

const colorToVariant: Record<StatusColor, BadgeVariant> = {
  green: 'green',
  yellow: 'yellow',
  red: 'red',
  blue: 'blue',
  gray: 'gray',
  purple: 'purple',
}

export function StatusBadge({ status, dot = true }: StatusBadgeProps) {
  const color = getStatusColor(status)
  return (
    <Badge variant={colorToVariant[color]} dot={dot}>
      {getStatusLabel(status)}
    </Badge>
  )
}

export default StatusBadge
