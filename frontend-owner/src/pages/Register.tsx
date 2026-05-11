import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  // Password strength
  const checks = {
    length:  form.password.length >= 8,
    upper:   /[A-Z]/.test(form.password),
    digit:   /[0-9]/.test(form.password),
    symbol:  /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password),
  }
  const strength = Object.values(checks).filter(Boolean).length
  const strengthLabel = ['', 'Faible', 'Moyen', 'Bon', 'Fort'][strength]
  const strengthColor = ['', '#EF4444', '#F59E0B', '#3B82F6', '#22C55E'][strength]

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Veuillez renseigner votre prénom et nom.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (strength < 3) {
      setError('Votre mot de passe est trop faible.')
      return
    }

    setLoading(true)
    const { error: err } = await register(form.email.trim(), form.password, form.firstName.trim(), form.lastName.trim())
    setLoading(false)

    if (err) {
      if (err.toLowerCase().includes('already registered') || err.toLowerCase().includes('already been registered')) {
        setError('Un compte existe déjà avec cet email.')
      } else {
        setError(err)
      }
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/'), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-8 transition-colors">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="StayPilot" className="h-16 w-auto mb-3" />
          <p className="text-sm text-muted">Espace propriétaire</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 transition-colors">
          <h2 className="text-xl font-semibold text-dark mb-6">Créer mon compte</h2>

          {success ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle size={40} className="text-green-500" />
              <p className="font-medium text-dark">Compte créé avec succès !</p>
              <p className="text-sm text-muted">Redirection en cours…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3 py-3">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Prénom / Nom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-dark mb-1.5">Prénom</label>
                  <input value={form.firstName} onChange={set('firstName')} placeholder="Jean"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-primary bg-bg dark:bg-gray-800 text-dark placeholder-muted transition-colors" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1.5">Nom</label>
                  <input value={form.lastName} onChange={set('lastName')} placeholder="Dupont"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-primary bg-bg dark:bg-gray-800 text-dark placeholder-muted transition-colors" required />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-dark mb-1.5">Adresse email</label>
                <input value={form.email} onChange={set('email')} type="email" placeholder="vous@exemple.fr"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-primary bg-bg dark:bg-gray-800 text-dark placeholder-muted transition-colors" required />
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-sm font-medium text-dark mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input value={form.password} onChange={set('password')}
                    type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-primary bg-bg dark:bg-gray-800 text-dark placeholder-muted transition-colors" required />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength bar */}
                {form.password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-colors"
                          style={{ backgroundColor: i <= strength ? strengthColor : '#E5E7EB' }} />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strengthColor }}>Sécurité : {strengthLabel}</p>
                    <ul className="mt-1.5 space-y-0.5">
                      {[
                        { ok: checks.length, label: 'Au moins 8 caractères' },
                        { ok: checks.upper,  label: 'Une majuscule (A-Z)' },
                        { ok: checks.digit,  label: 'Un chiffre (0-9)' },
                        { ok: checks.symbol, label: 'Un symbole (!@#$…)' },
                      ].map(({ ok, label }) => (
                        <li key={label} className={`text-xs flex items-center gap-1.5 ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                          <CheckCircle size={11} className={ok ? 'text-green-500' : 'text-gray-300'} />
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirmer */}
              <div>
                <label className="block text-sm font-medium text-dark mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <input value={form.confirm} onChange={set('confirm')}
                    type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-primary bg-bg dark:bg-gray-800 text-dark placeholder-muted transition-colors" required />
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.confirm.length > 0 && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${form.password === form.confirm ? 'text-green-600' : 'text-red-500'}`}>
                    <CheckCircle size={11} />
                    {form.password === form.confirm ? 'Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas'}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold bg-[#EA580C] hover:bg-[#C2410C] transition-colors disabled:opacity-60 mt-2">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Création en cours…
                  </span>
                ) : 'Créer mon compte'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-[#EA580C] font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
