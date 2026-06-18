import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Eye, EyeOff, AlertCircle, Check, Mail, Shield,
  ChevronRight, LogOut, KeyRound, Building2, Users, Wrench
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import OtpVerify from './OtpVerify'
import api from '../lib/api'
import { supabase } from '../lib/supabase'

// ── Device ID ─────────────────────────────────────────────────────────────────
const DEVICE_KEY = 'sp_device_id'
function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

// ── Espaces ───────────────────────────────────────────────────────────────────
const SPACES = [
  {
    id: 'concierge',
    Icon: Building2,
    title: 'Espace Conciergerie',
    subtitle: 'Pilotez vos logements',
    description:
      'Synchronisation multi-plateformes, messagerie automatique, facturation propriétaires et planning centralisé.',
    gradient: 'from-orange-500/10 to-orange-400/5 border-orange-400/25',
    iconBg: 'bg-orange-50',
    iconColor: 'text-primary',
  },
  {
    id: 'owner',
    Icon: Users,
    title: 'Portail Propriétaire',
    subtitle: 'Suivez vos revenus',
    description:
      'Revenus en temps réel, calendrier de réservations, documents et rapports — accessible 24h/24.',
    gradient: 'from-blue-500/10 to-blue-400/5 border-blue-400/25',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  {
    id: 'agent',
    Icon: Wrench,
    title: 'Espace Agents',
    subtitle: 'Gérez vos missions',
    description:
      'Missions ménage, check-lists interactives et upload photos directement depuis le terrain.',
    gradient: 'from-emerald-500/10 to-emerald-400/5 border-emerald-400/25',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
]

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = 'login' | 'otp' | 'totp' | 'magic-sent'

interface OtpState {
  userId: string
  userEmail: string
  maskedEmail: string
  deviceId: string
}

interface TotpState {
  factorId: string
  challengeId: string
  userId: string
  deviceId: string
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [step, setStep] = useState<Step>('login')
  const [otpState, setOtpState] = useState<OtpState | null>(null)
  const [totpState, setTotpState] = useState<TotpState | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpError, setTotpError] = useState<string | null>(null)
  const [totpLoading, setTotpLoading] = useState(false)

  const [useMagicLink, setUseMagicLink] = useState(false)
  const [magicEmail, setMagicEmail] = useState('')
  const [magicLoading, setMagicLoading] = useState(false)

  const [hoveredTab, setHoveredTab] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState(0)

  const { login, user, logout } = useAuth()
  const navigate = useNavigate()

  const displayTab = hoveredTab ?? activeTab
  const isConnected = !!user

  // ── Device check (commun login + TOTP) ────────────────────────────────────
  const doDeviceCheck = async (userId: string, deviceId: string, userEmail: string) => {
    try {
      const checkRes = await api.post('/api/auth/check-device', { userId, deviceId })
      if (checkRes.data.trusted) {
        navigate('/portal')
        return
      }
      const otpRes = await api.post('/api/auth/send-otp', { userId, deviceId, userEmail })
      setOtpState({
        userId,
        userEmail,
        maskedEmail: otpRes.data.maskedEmail ?? userEmail,
        deviceId,
      })
      setStep('otp')
    } catch {
      navigate('/portal')
    }
  }

  // ── Login classique ───────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: err, user: u } = await login(email, password)
    if (err || !u) {
      setLoading(false)
      const msg = (err ?? '').toLowerCase()
      if (msg.includes('invalid') || msg.includes('credentials')) {
        setError('Email ou mot de passe incorrect.')
      } else if (msg.includes('not confirmed')) {
        setError("Votre email n'est pas confirmé. Vérifiez votre boîte mail.")
      } else {
        setError(err ?? 'Erreur de connexion.')
      }
      return
    }

    const deviceId = getOrCreateDeviceId()

    // Vérifier si TOTP est activé
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.find((f) => f.status === 'verified')
      if (totp) {
        const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
          factorId: totp.id,
        })
        if (challengeErr || !challenge) throw new Error('challenge failed')
        setTotpState({ factorId: totp.id, challengeId: challenge.id, userId: u.id, deviceId })
        setLoading(false)
        setStep('totp')
        return
      }
    } catch {
      // Pas de TOTP → continuer vers device check
    }

    setLoading(false)
    await doDeviceCheck(u.id, deviceId, u.email ?? email)
  }

  // ── TOTP vérification ─────────────────────────────────────────────────────
  const handleTotpVerify = async (e: FormEvent) => {
    e.preventDefault()
    if (!totpState) return
    setTotpError(null)
    setTotpLoading(true)
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: totpState.factorId,
        challengeId: totpState.challengeId,
        code: totpCode,
      })
      if (error) {
        setTotpError("Code invalide. Vérifiez votre application d'authentification.")
        setTotpLoading(false)
        return
      }
      const { data: sessionData } = await supabase.auth.getSession()
      const userEmail = sessionData?.session?.user?.email ?? ''
      await doDeviceCheck(totpState.userId, totpState.deviceId, userEmail)
    } catch {
      setTotpError('Erreur de vérification.')
      setTotpLoading(false)
    }
  }

  // ── Magic link ────────────────────────────────────────────────────────────
  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMagicLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: magicEmail.trim(),
        options: { emailRedirectTo: 'https://app.staypilot.cc/portal' },
      })
      if (error) {
        setError(error.message)
        setMagicLoading(false)
        return
      }
      setStep('magic-sent')
    } catch {
      setError("Erreur lors de l'envoi.")
    }
    setMagicLoading(false)
  }

  const handleLogout = async () => {
    await logout()
  }

  // ── OTP screen ────────────────────────────────────────────────────────────
  if (step === 'otp' && otpState) {
    return (
      <OtpVerify
        userId={otpState.userId}
        userEmail={otpState.userEmail}
        deviceId={otpState.deviceId}
        maskedEmail={otpState.maskedEmail}
        onSuccess={() => navigate('/portal')}
      />
    )
  }

  // ── TOTP screen ───────────────────────────────────────────────────────────
  if (step === 'totp') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.png" alt="StayPilot" className="h-10 w-auto mb-3" />
            <div className="flex items-center gap-2 text-primary">
              <Shield size={18} />
              <span className="font-semibold text-sm">Authentification à deux facteurs</span>
            </div>
          </div>
          <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
            <p className="text-sm text-muted mb-5 text-center leading-relaxed">
              Entrez le code à 6 chiffres généré par votre application d'authentification
              (Google Authenticator, Authy…)
            </p>
            <form onSubmit={handleTotpVerify} className="space-y-4">
              {totpError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-3">
                  <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{totpError}</p>
                </div>
              )}
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000 000"
                autoFocus
                className="w-full px-4 py-4 text-center text-2xl font-mono tracking-[0.4em] border border-border rounded-xl focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted/40 transition-colors"
              />
              <button
                type="submit"
                disabled={totpLoading || totpCode.length !== 6}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold bg-primary hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {totpLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Vérification…
                  </span>
                ) : (
                  'Vérifier le code'
                )}
              </button>
            </form>
          </div>
          <p className="text-center text-xs text-muted mt-4">
            Problème d'accès ?{' '}
            <button onClick={() => setStep('login')} className="text-primary hover:underline">
              Retour
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ── Magic link sent ───────────────────────────────────────────────────────
  if (step === 'magic-sent') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.png" alt="StayPilot" className="h-10 w-auto mb-3" />
          </div>
          <div className="bg-surface rounded-2xl shadow-sm border border-border p-8">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-dark mb-2">Vérifiez votre email</h2>
            <p className="text-sm text-muted leading-relaxed">
              Un lien de connexion a été envoyé à{' '}
              <strong className="text-dark">{magicEmail}</strong>.
              <br />
              Cliquez dessus pour vous connecter automatiquement — sans mot de passe.
            </p>
            <button
              onClick={() => {
                setStep('login')
                setUseMagicLink(false)
              }}
              className="mt-6 text-sm text-primary hover:underline"
            >
              ← Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main: Login / Connected ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-10 transition-colors">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-5 items-stretch">

        {/* ── LEFT : 3 espaces ── */}
        <div className="flex flex-col gap-3 lg:w-72 shrink-0">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1 px-1 hidden lg:block">
            Votre espace
          </p>
          {SPACES.map((space, i) => {
            const isActive = displayTab === i
            const { Icon } = space
            return (
              <button
                key={space.id}
                onMouseEnter={() => setHoveredTab(i)}
                onMouseLeave={() => setHoveredTab(null)}
                onClick={() => setActiveTab(i)}
                className={`
                  relative text-left rounded-2xl border bg-gradient-to-br px-4 py-3.5
                  transition-all duration-300 ease-in-out cursor-pointer
                  ${space.gradient}
                  ${isActive
                    ? 'opacity-100 shadow-md scale-[1.02]'
                    : 'opacity-45 hover:opacity-65'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl ${space.iconBg} shrink-0 mt-0.5`}>
                    <Icon size={18} className={space.iconColor} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-dark text-sm leading-tight">{space.title}</p>
                    <p className="text-xs text-muted mt-0.5">{space.subtitle}</p>
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        isActive ? 'max-h-20 opacity-100 mt-2' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <p className="text-xs text-muted leading-relaxed">{space.description}</p>
                    </div>
                  </div>
                  <ChevronRight
                    size={15}
                    className={`shrink-0 text-muted/60 transition-transform duration-200 mt-0.5 ${
                      isActive ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </button>
            )
          })}
          <p className="text-xs text-muted text-center mt-3 hidden lg:block">
            StayPilot · Votre copilote conciergerie
          </p>
        </div>

        {/* ── RIGHT : formulaire / compte ── */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 sm:p-8 transition-colors">

            {/* Logo + titre */}
            <div className="flex flex-col items-center mb-6">
              <img src="/logo.png" alt="StayPilot" className="h-10 sm:h-12 w-auto mb-3" />
              <h1 className="text-base font-bold text-dark">
                {isConnected ? 'Mon compte' : 'Bienvenue'}
              </h1>
              <p className="text-sm text-muted mt-1 text-center">
                {isConnected
                  ? 'Vous êtes connecté à StayPilot'
                  : 'Connectez-vous à votre espace de gestion'}
              </p>
            </div>

            {/* ── Déjà connecté ── */}
            {isConnected ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 bg-bg rounded-xl border border-border px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {(user.email?.[0] ?? '?').toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-dark truncate">{user.email}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {user.email_confirmed_at ? (
                        <>
                          <Check size={11} className="text-emerald-500" />
                          <span className="text-xs text-emerald-600">Email vérifié</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={11} className="text-amber-500" />
                          <span className="text-xs text-amber-600">Email non vérifié</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/portal')}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
                >
                  <span>Accéder au tableau de bord</span>
                  <ChevronRight size={16} />
                </button>

                <button
                  onClick={() => navigate('/settings')}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-bg text-dark text-sm hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRound size={15} className="text-muted" />
                    <span>Changer le mot de passe</span>
                  </div>
                  <ChevronRight size={14} className="text-muted" />
                </button>

                <button
                  onClick={() => navigate('/settings')}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-bg text-dark text-sm hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Shield size={15} className="text-muted" />
                    <span>Authentification à deux facteurs</span>
                  </div>
                  <ChevronRight size={14} className="text-muted" />
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 border border-red-100 transition-colors"
                >
                  <LogOut size={14} />
                  Se déconnecter
                </button>
              </div>
            ) : (
              <div>
                <div className="flex rounded-xl border border-border overflow-hidden mb-5 text-sm">
                  <button
                    type="button"
                    onClick={() => setUseMagicLink(false)}
                    className={`flex-1 py-2.5 font-medium transition-colors ${
                      !useMagicLink
                        ? 'bg-primary text-white'
                        : 'text-muted hover:text-dark bg-transparent'
                    }`}
                  >
                    Mot de passe
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseMagicLink(true)}
                    className={`flex-1 py-2.5 font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      useMagicLink
                        ? 'bg-primary text-white'
                        : 'text-muted hover:text-dark bg-transparent'
                    }`}
                  >
                    <Mail size={13} />
                    Lien email
                  </button>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3 py-3 mb-4">
                    <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {useMagicLink ? (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-dark mb-1.5">
                        Adresse email
                      </label>
                      <input
                        type="email"
                        value={magicEmail}
                        onChange={(e) => setMagicEmail(e.target.value)}
                        placeholder="admin@staypilot.fr"
                        required
                        className="w-full px-3 py-3 text-sm border border-border rounded-lg focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
                      />
                    </div>
                    <p className="text-xs text-muted -mt-1">
                      Vous recevrez un lien de connexion sécurisé — aucun mot de passe requis.
                    </p>
                    <button
                      type="submit"
                      disabled={magicLoading}
                      className="w-full py-3 rounded-xl text-white text-sm font-semibold bg-primary hover:bg-primary-dark transition-colors disabled:opacity-60"
                    >
                      {magicLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Envoi…
                        </span>
                      ) : (
                        'Envoyer le lien de connexion'
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-dark mb-1.5">
                        Adresse email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@staypilot.fr"
                        required
                        className="w-full px-3 py-3 text-base sm:text-sm border border-border rounded-lg focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-dark">
                          Mot de passe
                        </label>
                        <Link
                          to="/forgot-password"
                          className="text-xs text-primary hover:underline"
                        >
                          Mot de passe oublié ?
                        </Link>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full px-3 py-3 pr-10 text-base sm:text-sm border border-border rounded-lg focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl text-white text-sm font-semibold bg-primary hover:bg-primary-dark transition-colors disabled:opacity-60 mt-2"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Connexion…
                        </span>
                      ) : (
                        'Se connecter'
                      )}
                    </button>
                  </form>
                )}

                <p className="text-center text-sm text-muted mt-5">
                  Pas encore de compte ?{' '}
                  <Link to="/register" className="text-primary font-medium hover:underline">
                    Créer un compte
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
