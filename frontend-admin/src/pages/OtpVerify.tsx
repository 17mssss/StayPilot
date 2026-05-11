import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { ShieldCheck, RefreshCw, AlertCircle, Mail } from 'lucide-react'
import api from '../lib/api'

interface OtpVerifyProps {
  userId:      string
  userEmail:   string
  deviceId:    string
  maskedEmail: string
  onSuccess:   () => void
}

export default function OtpVerify({
  userId, userEmail, deviceId, maskedEmail, onSuccess,
}: OtpVerifyProps) {
  const [digits, setDigits]   = useState<string[]>(Array(6).fill(''))
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(0) // secondes avant pouvoir renvoyer
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus sur le premier champ au montage
  useEffect(() => { inputRefs.current[0]?.focus() }, [])

  // Compte à rebours pour le renvoi
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // ── Gestion saisie ────────────────────────────────────────────────────────

  const handleChange = (index: number, value: string) => {
    // N'accepte que les chiffres
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError(null)

    // Avancer au champ suivant
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit si tous les chiffres sont remplis
    if (digit && index === 5) {
      const fullCode = [...next.slice(0, 5), digit].join('')
      if (fullCode.length === 6) submitCode(fullCode)
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]; next[index] = ''; setDigits(next)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    const next = Array(6).fill('')
    text.split('').forEach((c, i) => { next[i] = c })
    setDigits(next)
    // Focus sur le dernier chiffre collé ou le suivant
    const focusIdx = Math.min(text.length, 5)
    inputRefs.current[focusIdx]?.focus()
    if (text.length === 6) submitCode(text)
  }

  // ── Vérification ──────────────────────────────────────────────────────────

  const submitCode = async (code: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/auth/verify-otp', {
        userId, deviceId, code,
        userAgent: navigator.userAgent,
      })
      if (res.data.valid) {
        onSuccess()
      } else {
        setError(res.data.error || 'Code incorrect.')
        // Vider les champs et re-focus
        setDigits(Array(6).fill(''))
        setTimeout(() => inputRefs.current[0]?.focus(), 50)
      }
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    const code = digits.join('')
    if (code.length < 6) {
      setError('Entrez les 6 chiffres du code.')
      return
    }
    submitCode(code)
  }

  // ── Renvoi du code ────────────────────────────────────────────────────────

  const handleResend = async () => {
    if (countdown > 0 || resending) return
    setResending(true)
    setError(null)
    try {
      await api.post('/api/auth/send-otp', { userId, deviceId, userEmail })
      setCountdown(60) // 60s avant de pouvoir renvoyer à nouveau
      setDigits(Array(6).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    } catch {
      setError('Erreur lors de l\'envoi. Réessayez.')
    } finally {
      setResending(false)
    }
  }

  const code = digits.join('')

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 transition-colors">
      <div className="w-full max-w-sm">

        {/* Icône + titre */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
            <ShieldCheck size={28} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-dark text-center">Vérification de l'appareil</h1>
          <p className="text-sm text-muted mt-2 text-center leading-relaxed">
            Nouvel appareil détecté. Un code à 6 chiffres a été envoyé à
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Mail size={13} className="text-primary flex-shrink-0" />
            <span className="text-sm font-semibold text-dark">{maskedEmail}</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">

          {/* Champs OTP */}
          <div className="flex items-center justify-center gap-2.5 mb-5">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={loading}
                className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-bg text-dark transition-all focus:outline-none disabled:opacity-50 ${
                  error
                    ? 'border-red-400 bg-red-50 dark:bg-red-950/20'
                    : digit
                    ? 'border-primary bg-primary/5'
                    : 'border-border focus:border-primary'
                }`}
              />
            ))}
          </div>

          {/* Séparateur visuel entre les 3 premiers et 3 derniers */}
          <style>{`
            .otp-group { display: contents; }
          `}</style>

          {/* Erreur */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Bouton valider */}
          <button
            onClick={handleSubmit}
            disabled={code.length < 6 || loading}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold bg-primary hover:bg-primary-dark transition-colors disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Vérification…
              </span>
            ) : 'Valider le code'}
          </button>

          {/* Renvoi */}
          <div className="text-center mt-4">
            {countdown > 0 ? (
              <p className="text-xs text-muted">
                Renvoyer dans <span className="font-semibold text-dark">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-xs text-primary font-medium hover:underline disabled:opacity-50 flex items-center gap-1.5 mx-auto"
              >
                <RefreshCw size={11} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Envoi…' : 'Renvoyer un nouveau code'}
              </button>
            )}
          </div>
        </div>

        {/* Note sécurité */}
        <p className="text-center text-xs text-muted mt-5 leading-relaxed">
          Cet appareil sera mémorisé après validation.<br />
          Vous ne serez plus demandé sur cet appareil.
        </p>
      </div>
    </div>
  )
}
