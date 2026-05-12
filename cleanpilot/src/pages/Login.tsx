import React, { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Sparkles, Phone, ArrowRight, Loader2 } from 'lucide-react'

type Step = 'phone' | 'otp'

export default function Login() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizePhone = (p: string) => {
    const digits = p.replace(/\D/g, '')
    if (digits.startsWith('0')) return '+33' + digits.slice(1)
    if (!digits.startsWith('+')) return '+33' + digits
    return '+' + digits
  }

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const normalized = normalizePhone(phone)
    const { error: err } = await supabase.auth.signInWithOtp({ phone: normalized })
    setLoading(false)
    if (err) {
      // Fallback: try email OTP if phone fails (for demo accounts)
      setError("Impossible d'envoyer le SMS. Vérifiez votre numéro.")
    } else {
      setStep('otp')
    }
  }

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const normalized = normalizePhone(phone)
    const { error: err } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: otp,
      type: 'sms',
    })
    setLoading(false)
    if (err) {
      setError('Code incorrect ou expiré. Réessayez.')
    }
    // AuthContext picks up the session automatically
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center mb-4 shadow-lg">
            <Sparkles size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-dark">CleanPilot</h1>
          <p className="text-sm text-muted mt-1">Vos missions ménage</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark mb-2">
                Votre numéro de téléphone
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  required
                  className="w-full pl-9 pr-4 py-3.5 text-base rounded-xl border border-border bg-surface text-dark placeholder-muted focus:outline-none focus:border-brand transition-colors"
                />
              </div>
              <p className="text-xs text-muted mt-2">
                Un code SMS vous sera envoyé pour vous connecter.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand text-white font-semibold text-base disabled:opacity-50 transition-opacity active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>Envoyer le code <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-dark">Code reçu par SMS</label>
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); setError(null) }}
                  className="text-xs text-brand hover:underline"
                >
                  Changer de numéro
                </button>
              </div>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full px-4 py-3.5 text-center text-2xl font-mono tracking-[0.5em] rounded-xl border border-border bg-surface text-dark placeholder-muted focus:outline-none focus:border-brand transition-colors"
              />
              <p className="text-xs text-muted mt-2 text-center">
                Code envoyé au {phone}
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand text-white font-semibold text-base disabled:opacity-50 transition-opacity active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>Se connecter <ArrowRight size={18} /></>
              )}
            </button>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full text-sm text-brand hover:underline py-2"
            >
              Renvoyer le code
            </button>
          </form>
        )}

        <p className="text-center text-xs text-muted mt-8">
          CleanPilot by StayPilot — v1.0
        </p>
      </div>
    </div>
  )
}
