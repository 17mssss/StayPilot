import React, { useEffect } from 'react'
import { Clock, RefreshCw, LogOut, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function PendingApproval() {
  const { agent, refreshAgent, logout } = useAuth()
  const isDeclined = agent?.status === 'declined'

  // Vérification automatique toutes les 10 secondes
  useEffect(() => {
    if (isDeclined) return
    const interval = setInterval(() => {
      refreshAgent()
    }, 10000)
    return () => clearInterval(interval)
  }, [refreshAgent, isDeclined])

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-5 safe-top safe-bottom">
      <div className="w-full max-w-sm text-center">

        {/* Icône */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
          isDeclined
            ? 'bg-red-50 border-2 border-red-200'
            : 'bg-orange-50 border-2 border-primary/30'
        }`}>
          {isDeclined
            ? <XCircle size={40} className="text-red-400" />
            : <Clock size={40} className="text-primary" />
          }
        </div>

        {/* Titre */}
        <h1 className="text-2xl font-extrabold text-dark mb-2">
          {isDeclined ? 'Accès refusé' : 'En attente d\'approbation'}
        </h1>
        <p className="text-sm text-muted mb-8 leading-relaxed">
          {isDeclined
            ? 'Votre demande a été refusée par la conciergerie. Contactez votre concierge pour plus d\'informations.'
            : 'Votre demande a été envoyée. Vous pourrez accéder à vos missions dès que votre concierge aura approuvé votre profil.'
          }
        </p>

        {/* Carte info */}
        <div className="bg-surface rounded-2xl border border-border shadow-card p-4 text-left mb-6">
          <p className="text-[11px] text-muted font-semibold uppercase tracking-wider mb-3">
            Votre profil
          </p>
          <div className="space-y-2.5">
            <Row label="Nom" value={agent?.full_name ?? '—'} />
            <Row label="Email" value={agent?.email ?? '—'} />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Statut</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isDeclined
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {isDeclined ? 'Refusé' : 'En attente'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {!isDeclined && (
          <button
            onClick={refreshAgent}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-bg border border-border text-sm font-medium text-dark mb-3 active:scale-[0.98] transition-transform"
          >
            <RefreshCw size={15} /> Vérifier l'état
          </button>
        )}

        <button
          onClick={logout}
          className="flex items-center justify-center gap-1.5 text-sm text-muted hover:text-dark transition-colors w-full py-2"
        >
          <LogOut size={14} /> Se déconnecter
        </button>

        {!isDeclined && (
          <p className="text-xs text-muted mt-6 leading-relaxed">
            Une notification sera envoyée à votre concierge.
            <br />La vérification est automatique.
          </p>
        )}

        <p className="text-xs text-muted/50 mt-8">CleanPilot by StayPilot — v1.0</p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-dark truncate max-w-[180px]">{value}</span>
    </div>
  )
}
