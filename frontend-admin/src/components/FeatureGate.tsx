import React, { useState } from 'react'
import { Lock } from 'lucide-react'
import { usePlan, type PlanConfig } from '../contexts/PlanContext'
import UpgradeModal from './UpgradeModal'

interface FeatureGateProps {
  feature: keyof PlanConfig['limits']
  children: React.ReactNode
  fallback?: React.ReactNode   // Affiché à la place si feature non dispo
  showLock?: boolean           // Afficher un cadenas sur le contenu bloqué
}

export default function FeatureGate({ feature, children, fallback, showLock = true }: FeatureGateProps) {
  const { canUse } = usePlan()
  const [showUpgrade, setShowUpgrade] = useState(false)

  if (canUse(feature)) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <>
      <div
        className="relative cursor-pointer group"
        onClick={() => setShowUpgrade(true)}
      >
        <div className="opacity-40 pointer-events-none select-none">
          {children}
        </div>
        {showLock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 rounded-lg backdrop-blur-sm group-hover:bg-white/80 transition-all">
            <div className="flex flex-col items-center gap-1 text-center px-4">
              <Lock className="w-5 h-5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                Fonctionnalité non incluse
              </span>
              <span className="text-xs text-orange-500 hover:underline">
                Voir les plans →
              </span>
            </div>
          </div>
        )}
      </div>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  )
}
