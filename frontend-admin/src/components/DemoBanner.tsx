import React, { useEffect, useState } from 'react'
import { useDemo } from '../contexts/DemoContext'
import { Sparkles, X, Clock } from 'lucide-react'

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0h 00m'
  const totalMin = Math.floor(ms / 60000)
  const h   = Math.floor(totalMin / 60)
  const min = totalMin % 60
  if (h >= 24) {
    const d = Math.floor(h / 24)
    const rh = h % 24
    return `${d}j ${rh}h`
  }
  return `${h}h ${String(min).padStart(2, '0')}m`
}

export default function DemoBanner() {
  const { isDemo, remainingMs, exitDemo, triggerUpgrade } = useDemo()
  const [remaining, setRemaining] = useState(remainingMs)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isDemo) return
    setRemaining(remainingMs)
    const interval = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1000
        if (next <= 0) { clearInterval(interval); exitDemo(); return 0 }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isDemo, remainingMs, exitDemo])

  if (!isDemo || dismissed) return null

  const urgent = remaining < 3 * 60 * 60 * 1000 // moins de 3h

  return (
    <div
      className={`relative flex items-center justify-between px-4 py-2 text-xs font-medium z-50 ${
        urgent
          ? 'bg-red-500 text-white'
          : 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white'
      }`}
    >
      {/* Gauche */}
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles size={13} className="flex-shrink-0 opacity-90" />
        <span className="truncate">
          Vous êtes en <strong>mode démo Enterprise</strong> — toutes les fonctionnalités sont disponibles.
        </span>
      </div>

      {/* Centre — compte à rebours */}
      <div className={`flex items-center gap-1.5 mx-4 flex-shrink-0 px-2 py-0.5 rounded-full ${
        urgent ? 'bg-white/20' : 'bg-white/15'
      }`}>
        <Clock size={11} />
        <span className="font-mono font-semibold">{formatCountdown(remaining)}</span>
        <span className="opacity-80">restant</span>
      </div>

      {/* Droite */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={triggerUpgrade}
          className="bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-full font-semibold text-[11px]"
        >
          Passer au Pro →
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="opacity-60 hover:opacity-100 transition-opacity ml-1"
          aria-label="Fermer la bannière démo"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
