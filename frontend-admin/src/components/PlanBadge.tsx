import React from 'react'
import { usePlan } from '../contexts/PlanContext'
import { Crown, Zap, Star } from 'lucide-react'

interface PlanBadgeProps {
  size?: 'sm' | 'md'
  showPrice?: boolean
}

const ICONS = {
  starter: Star,
  pro: Zap,
  business: Crown,
}

export default function PlanBadge({ size = 'md', showPrice = false }: PlanBadgeProps) {
  const { plan } = usePlan()
  const Icon = ICONS[plan.id]

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5 gap-1'
    : 'text-xs px-2.5 py-1 gap-1.5'

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${sizeClasses} ${plan.color} ${plan.textColor} ${plan.borderColor}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {plan.name}
      {showPrice && (
        <span className="opacity-60 font-normal">{plan.price}€/mois</span>
      )}
    </span>
  )
}
