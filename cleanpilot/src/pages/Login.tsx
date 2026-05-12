import React, { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'

type Mode = 'login' | 'forgot' | 'forgot-sent'

export default function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (err) {
      if (err.message.toLowerCase().includes('invalid')) {
        setError('Email ou mot de passe incorrect.')
      } else {
        setError(err.message)
      }
    }
    // AuthContext picks up session automatically
  }

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) setError("Impossible d'envoyer l'email. Vérifiez l'adresse.")
    else setMode('forgot-sent')
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-5 safe-top safe-bottom">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-md">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-dark tracking-tight">CleanPilot</h1>
          <p className="text-sm text-muted mt-1">Vos missions ménage</p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl shadow-card border border-border p-6">

          {mode === 'login' && (
            <>
              <h2 className="text-lg font-bold text-dark mb-5">Connexion</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                    <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-dark mb-1.5">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="vous@exemple.fr" autoComplete="email" required
                    className="w-full px-3 py-3 text-sm rounded-xl border border-border bg-bg text-dark placeholder-muted focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" autoComplete="current-password" required
                      className="w-full px-3 py-3 pr-10 text-sm rounded-xl border border-border bg-bg text-dark placeholder-muted focus:outline-none focus:border-primary transition-colors"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <button type="button" onClick={() => { setMode('forgot'); setError(null) }}
                    className="text-sm text-primary hover:underline">
                    Mot de passe oublié ?
                  </button>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-colors disabled:opacity-60 active:scale-[0.98]">
                  {loading
                    ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Connexion…</span>
                    : 'Se connecter'
                  }
                </button>
              </form>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <button onClick={() => { setMode('login'); setError(null) }}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-dark mb-4 transition-colors">
                <ArrowLeft size={14} /> Retour
              </button>
              <h2 className="text-lg font-bold text-dark mb-1">Réinitialiser</h2>
              <p className="text-sm text-muted mb-4">Un lien vous sera envoyé par email.</p>
              <form onSubmit={handleForgot} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                    <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr" autoComplete="email" required
                  className="w-full px-3 py-3 text-sm rounded-xl border border-border bg-bg text-dark placeholder-muted focus:outline-none focus:border-primary transition-colors"
                />
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-colors disabled:opacity-60">
                  {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Envoi…</span> : 'Envoyer le lien'}
                </button>
              </form>
            </>
          )}

          {mode === 'forgot-sent' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 size={44} className="text-green-500" />
              <p className="font-bold text-dark">Email envoyé !</p>
              <p className="text-sm text-muted">Vérifiez votre boîte mail et cliquez sur le lien.</p>
              <button onClick={() => setMode('login')}
                className="mt-2 text-sm text-primary hover:underline">Retour à la connexion</button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6">CleanPilot by StayPilot — v1.0</p>
      </div>
    </div>
  )
}
