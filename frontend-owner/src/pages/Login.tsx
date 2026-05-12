import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotLoading(true)
    setForgotError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setForgotLoading(false)
    if (err) {
      setForgotError("Impossible d'envoyer l'email. Vérifiez l'adresse et réessayez.")
    } else {
      setForgotSent(true)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.')
      return
    }

    setLoading(true)
    const { error: loginError } = await login(email.trim(), password)
    setLoading(false)

    if (loginError) {
      const msg = loginError.toLowerCase()
      if (msg.includes('invalid') || msg.includes('invalid login credentials')) {
        setError('Email ou mot de passe incorrect.')
      } else if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setError("Votre email n'est pas confirmé. Vérifiez votre boîte mail et cliquez sur le lien de confirmation.")
      } else {
        setError(loginError)
      }
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 transition-colors">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="StayPilot" className="h-16 w-auto mb-3" />
          <p className="text-sm text-muted">Espace propriétaire</p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 transition-colors">

          {forgotMode ? (
            /* ── Forgot password panel ── */
            <div>
              <button onClick={() => { setForgotMode(false); setForgotSent(false); setForgotError(null) }}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-dark mb-5 transition-colors">
                <ArrowLeft size={15} /> Retour à la connexion
              </button>
              <h2 className="text-xl font-semibold text-dark mb-2">Mot de passe oublié</h2>
              <p className="text-sm text-muted mb-5">On vous envoie un lien pour réinitialiser votre mot de passe.</p>

              {forgotSent ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle2 size={40} className="text-green-500" />
                  <p className="text-sm font-medium text-dark text-center">Email envoyé !</p>
                  <p className="text-xs text-muted text-center">Vérifiez votre boîte mail et cliquez sur le lien reçu.</p>
                  <button onClick={() => { setForgotMode(false); setForgotSent(false) }}
                    className="mt-2 text-sm text-primary hover:underline">Retour à la connexion</button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {forgotError && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3 py-3">
                      <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-600">{forgotError}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-dark mb-1.5">Votre adresse email</label>
                    <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      placeholder="vous@exemple.fr" autoComplete="email" required
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-bg text-dark placeholder-muted focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <button type="submit" disabled={forgotLoading}
                    className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-base font-semibold transition-colors disabled:opacity-60">
                    {forgotLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Envoi…
                      </span>
                    ) : 'Envoyer le lien'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* ── Login form ── */
            <>
              <h2 className="text-xl font-semibold text-dark mb-6">Connexion</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-3">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-dark mb-1.5">Adresse email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="vous@exemple.fr" autoComplete="email" required
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-bg dark:bg-gray-800 text-dark placeholder-muted focus:outline-none focus:border-primary transition-colors" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" autoComplete="current-password" required
                      className="w-full px-3 py-2.5 pr-10 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-bg dark:bg-gray-800 text-dark placeholder-muted focus:outline-none focus:border-primary transition-colors" />
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <button type="button" onClick={() => { setForgotMode(true); setForgotEmail(email) }}
                    className="text-sm text-primary hover:underline">
                    Mot de passe oublié ?
                  </button>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-base font-semibold transition-colors disabled:opacity-60">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Connexion…
                    </span>
                  ) : 'Se connecter'}
                </button>
              </form>

              <p className="text-center text-xs text-muted mt-6">
                Problème de connexion ?{' '}
                <a href="mailto:support@staypilot.fr" className="text-primary hover:underline">Contactez l'équipe</a>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-sm text-muted mt-5">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">Créer un compte</Link>
        </p>

        <p className="text-center text-xs text-muted mt-4">© 2026 StayPilot – Tous droits réservés</p>
      </div>
    </div>
  )
}
