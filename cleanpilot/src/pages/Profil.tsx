import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, User, Mail, CheckCircle2, AlertCircle, Building2 } from 'lucide-react'

export default function Profil() {
  const { agent, logout } = useAuth()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [conciergeName, setConciergeName] = useState<string | null>(null)

  useEffect(() => {
    if (!agent?.concierge_id) return
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    fetch(
      `${SUPABASE_URL}/rest/v1/concierge_profiles?select=company_name,concierge_code&id=eq.${agent.concierge_id}&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
      .then(r => r.json())
      .then(rows => {
        if (Array.isArray(rows) && rows.length > 0) {
          setConciergeName(rows[0].company_name || rows[0].concierge_code || null)
        }
      })
      .catch(() => {})
  }, [agent?.concierge_id])

  const handleLogout = async () => {
    setLoading(true)
    await logout()
    navigate('/login', { replace: true })
  }

  const initials = agent?.full_name
    ? agent.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="min-h-screen bg-bg px-4 pt-10 pb-20">
      {/* Avatar + nom */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-md mb-3">
          {initials}
        </div>
        <h1 className="text-xl font-extrabold text-dark">{agent?.full_name ?? '—'}</h1>
        <p className="text-sm text-muted mt-0.5">{agent?.email ?? '—'}</p>
        {conciergeName && (
          <p className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
            <Building2 size={11} /> {conciergeName}
          </p>
        )}
        <span className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
          agent?.status === 'approved'
            ? 'bg-green-100 text-green-700'
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {agent?.status === 'approved'
            ? <><CheckCircle2 size={12} /> Agent actif</>
            : <><AlertCircle size={12} /> En attente</>
          }
        </span>
      </div>

      {/* Infos */}
      <div className="bg-surface rounded-2xl border border-border divide-y divide-border mb-6">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <User size={16} className="text-muted flex-shrink-0" />
          <div>
            <p className="text-xs text-muted">Nom complet</p>
            <p className="text-sm font-medium text-dark">{agent?.full_name ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Mail size={16} className="text-muted flex-shrink-0" />
          <div>
            <p className="text-xs text-muted">Email</p>
            <p className="text-sm font-medium text-dark">{agent?.email ?? '—'}</p>
          </div>
        </div>
        {(conciergeName || agent?.concierge_id) && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Building2 size={16} className="text-muted flex-shrink-0" />
            <div>
              <p className="text-xs text-muted">Conciergerie</p>
              <p className="text-sm font-medium text-dark">{conciergeName ?? '—'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bouton déconnexion */}
      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 active:scale-[0.98] transition-all"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      ) : (
        <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
          <p className="text-sm text-dark font-semibold text-center">Confirmer la déconnexion ?</p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirm(false)}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-muted hover:text-dark transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-60"
            >
              {loading ? 'Déconnexion…' : 'Confirmer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
