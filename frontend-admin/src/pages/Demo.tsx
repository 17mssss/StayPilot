/**
 * Demo.tsx — Page d'entrée démo (/demo)
 *
 * - Appelle GET /api/demo/token (avec X-Demo-Token si déjà existant)
 * - Stocke le token dans DemoContext + localStorage
 * - Redirige vers le Dashboard (/), qui affiche alors les données de démo
 */

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDemo } from '../contexts/DemoContext'
import { Sparkles, Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const DEMO_TOKEN_KEY   = 'staypilot_demo_token'

export default function Demo() {
  const navigate     = useNavigate()
  const { isDemo, startDemo } = useDemo()
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Si déjà en mode démo → rediriger directement
    if (isDemo) {
      navigate('/', { replace: true })
      return
    }

    async function fetchToken() {
      try {
        const existing = localStorage.getItem(DEMO_TOKEN_KEY)
        const headers: Record<string, string> = {}
        if (existing) headers['X-Demo-Token'] = existing

        const res = await fetch(`${API_URL}/api/demo/token`, { headers })
        const json = await res.json()

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Impossible de démarrer la démo')
        }

        const { token, expires_at } = json.data
        startDemo(token, expires_at)
        navigate('/', { replace: true })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
        setLoading(false)
      }
    }

    fetchToken()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-bg p-6">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <Sparkles size={22} className="text-red-500" />
        </div>
        <h1 className="text-lg font-semibold text-dark">Démo indisponible</h1>
        <p className="text-sm text-muted text-center max-w-xs">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-bg p-6">
      {/* Logo + spinner */}
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
        <Sparkles size={28} className="text-white" />
        <div
          className="absolute -inset-1 rounded-2xl border-2 border-violet-400 border-t-transparent animate-spin"
          style={{ animationDuration: '1.2s' }}
        />
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold text-dark">Préparation de votre démo</h1>
        <p className="text-sm text-muted mt-1">Chargement de l'environnement Enterprise…</p>
      </div>

      <Loader2 size={20} className="text-muted animate-spin" />
    </div>
  )
}
