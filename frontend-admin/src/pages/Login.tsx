import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import OtpVerify from './OtpVerify'
import api from '../lib/api'

// ── Helpers device ID ─────────────────────────────────────────────────────────

const DEVICE_KEY = 'sp_device_id'

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    // Génère un UUID v4 simple sans dépendance
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

// ── Composant Login ───────────────────────────────────────────────────────────

type Step = 'login' | 'otp'

interface OtpState {
  userId:      string
  userEmail:   string
  maskedEmail: string
  deviceId:    string
}

export default function Login() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [step, setStep]             = useState<Step>('login')
  const [otpState, setOtpState]     = useState<OtpState | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // 1. Authentification Supabase normale
    const { error: err, user } = await login(email, password)
    if (err || !user) {
      setLoading(false)
      const msg = (err || '').toLowerCase()
      if (msg.includes('invalid') || msg.includes('credentials')) {
        setError('Email ou mot de passe incorrect.')
      } else if (msg.includes('not confirmed')) {
        setError("Votre email n'est pas confirmé. Vérifiez votre boîte mail.")
      } else {
        setError(err || 'Erreur de connexion.')
      }
      return
    }

    // 2. Vérifier si l'appareil est de confiance
    const deviceId = getOrCreateDeviceId()
    try {
      const checkRes = await api.post('/api/auth/check-device', {
        userId:   user.id,
        deviceId,
      })

      if (checkRes.data.trusted) {
        // ✅ Appareil connu → accès direct
        setLoading(false)
        navigate('/')
        return
      }

      // 3. Nouvel appareil → envoyer l'OTP et afficher l'écran de vérification
      const otpRes = await api.post('/api/auth/send-otp', {
        userId:    user.id,
        deviceId,
        userEmail: user.email,
      })

      setLoading(false)
      setOtpState({
        userId:      user.id,
        userEmail:   user.email ?? email,
        maskedEmail: otpRes.data.maskedEmail ?? email,
        deviceId,
      })
      setStep('otp')
    } catch {
      // En cas d'erreur du device check (ex: backend indisponible),
      // on laisse passer pour ne pas bloquer le client
      console.warn('[LOGIN] Device check unavailable — bypassing 2FA')
      setLoading(false)
      navigate('/')
    }
  }

  const handleOtpSuccess = () => {
    navigate('/')
  }

  // ── Écran OTP ─────────────────────────────────────────────────────────────
  if (step === 'otp' && otpState) {
    return (
      <OtpVerify
        userId={otpState.userId}
        userEmail={otpState.userEmail}
        deviceId={otpState.deviceId}
        maskedEmail={otpState.maskedEmail}
        onSuccess={handleOtpSuccess}
      />
    )
  }

  // ── Écran Login ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 transition-colors">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="StayPilot" className="h-10 sm:h-14 w-auto mb-3" />
          <h1 className="text-lg font-bold text-dark">Espace Conciergerie</h1>
          <p className="text-sm text-muted mt-1 text-center leading-relaxed">
            Pilotez vos locations.<br />
            <span className="text-primary font-medium">Enchantez vos voyageurs.</span>
          </p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-border p-5 sm:p-8 transition-colors">
          <h2 className="text-xl font-semibold text-dark mb-1">Bienvenue</h2>
          <p className="text-sm text-muted mb-6">Connectez-vous à votre espace de gestion</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3 py-3">
                <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Adresse email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@staypilot.fr" required
                className="w-full px-3 py-3 text-base sm:text-sm border border-border rounded-lg focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Mot de passe</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  className="w-full px-3 py-3 pr-10 text-base sm:text-sm border border-border rounded-lg focus:outline-none focus:border-primary bg-bg text-dark placeholder:text-muted transition-colors" />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold bg-primary hover:bg-primary-dark transition-colors disabled:opacity-60 mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connexion…
                </span>
              ) : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-5">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">Créer un compte</Link>
        </p>

        <p className="text-center text-xs text-muted mt-4">
          StayPilot · Votre copilote conciergerie
        </p>
      </div>
    </div>
  )
}
