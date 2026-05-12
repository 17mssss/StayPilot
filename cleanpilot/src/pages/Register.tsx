import React, { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, Eye, EyeOff, AlertCircle, Loader2,
  CheckCircle2, Users, Building2,
} from 'lucide-react'

type Step = 1 | 2 | 3

/** Génère un code alphanumérique aléatoire de longueur n */
function genCode(n = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < n; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// ── Petits composants réutilisables ────────────────────────────────────────────

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
      <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-red-600">{msg}</p>
    </div>
  )
}

function LoadingLabel({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <Loader2 size={16} className="animate-spin" /> {label}
    </span>
  )
}

const inputCls =
  'w-full px-3 py-3 text-sm rounded-xl border border-border bg-bg text-dark placeholder-muted focus:outline-none focus:border-primary transition-colors'

const btnPrimary =
  'w-full py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-colors disabled:opacity-60 active:scale-[0.98]'

// ── Page principale ────────────────────────────────────────────────────────────

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Étape 1
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  // Étape 2
  const [conciergeCode, setConciergeCode] = useState('')
  const [conciergeProfile, setConciergeProfile] = useState<{
    id: string
    company_name: string
  } | null>(null)

  // Étape 3
  const [teamMode, setTeamMode] = useState<'create' | 'join'>('create')
  const [teamName, setTeamName] = useState('')
  const [teamCode, setTeamCode] = useState('')

  // userId créé à l'étape 1
  const [userId, setUserId] = useState<string | null>(null)

  // ── Étape 1 : création du compte Supabase ────────────────────────────────────
  const handleStep1 = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    })

    setLoading(false)

    if (err || !data.user) {
      if (err?.message.toLowerCase().includes('already')) {
        setError('Cette adresse email est déjà utilisée. Connectez-vous.')
      } else {
        setError(err?.message ?? 'Erreur lors de la création du compte.')
      }
      return
    }

    setUserId(data.user.id)
    setStep(2)
  }

  // ── Étape 2 : vérification du code de conciergerie ───────────────────────────
  const handleStep2 = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: err } = await supabase
      .from('concierge_profiles')
      .select('id, company_name')
      .eq('concierge_code', conciergeCode.trim().toUpperCase())
      .maybeSingle()

    setLoading(false)

    if (err || !data) {
      setError('Code introuvable. Vérifiez le code fourni par votre concierge.')
      return
    }

    setConciergeProfile(data)
    setStep(3)
  }

  // ── Étape 3 : créer ou rejoindre une équipe ──────────────────────────────────
  const handleStep3 = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!userId || !conciergeProfile) { setLoading(false); return }

    let teamId: string | null = null

    if (teamMode === 'create') {
      // Créer une nouvelle équipe avec un code unique
      const code = genCode(6)
      const { data, error: err } = await supabase
        .from('cleaning_teams')
        .insert({
          team_name: teamName.trim(),
          team_code: code,
          concierge_id: conciergeProfile.id,
        })
        .select('id')
        .single()

      if (err || !data) {
        setError("Impossible de créer l'équipe. Réessayez.")
        setLoading(false)
        return
      }
      teamId = data.id
    } else {
      // Rejoindre une équipe existante via son code
      const { data, error: err } = await supabase
        .from('cleaning_teams')
        .select('id')
        .eq('team_code', teamCode.trim().toUpperCase())
        .maybeSingle()

      if (err || !data) {
        setError("Code d'équipe introuvable. Demandez le code à votre collègue.")
        setLoading(false)
        return
      }
      teamId = data.id
    }

    // Créer l'enregistrement agent (statut = pending)
    const { error: agentErr } = await supabase
      .from('cleaning_agents')
      .insert({
        user_id: userId,
        email: email.trim(),
        full_name: fullName.trim(),
        team_id: teamId,
        concierge_id: conciergeProfile.id,
        status: 'pending',
      })

    setLoading(false)

    if (agentErr) {
      setError('Erreur lors de l\'envoi de la demande : ' + agentErr.message)
      return
    }

    // Succès → App.tsx redirigera vers l'écran d'attente
    navigate('/', { replace: true })
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
          <p className="text-sm text-muted mt-1">Créer votre compte</p>
        </div>

        {/* Progression */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {([1, 2, 3] as Step[]).map(s => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step
                  ? 'bg-primary w-8'
                  : s < step
                  ? 'bg-primary/40 w-2'
                  : 'bg-border w-2'
              }`}
            />
          ))}
        </div>

        {/* Carte */}
        <div className="bg-surface rounded-2xl shadow-card border border-border p-6">

          {/* ─ Étape 1 : Mon compte ─ */}
          {step === 1 && (
            <>
              <h2 className="text-lg font-bold text-dark mb-1">Mon compte</h2>
              <p className="text-sm text-muted mb-5">Créez votre accès CleanPilot</p>
              <form onSubmit={handleStep1} className="space-y-4">
                {error && <ErrorBox msg={error} />}
                <div>
                  <label className="block text-sm font-medium text-dark mb-1.5">Nom complet</label>
                  <input
                    type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    required placeholder="Jean Dupont" autoComplete="name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1.5">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required placeholder="vous@exemple.fr" autoComplete="email"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      required minLength={6} placeholder="Minimum 6 caractères"
                      autoComplete="new-password"
                      className={`${inputCls} pr-10`}
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className={btnPrimary}>
                  {loading ? <LoadingLabel label="Création du compte…" /> : 'Continuer →'}
                </button>
              </form>
            </>
          )}

          {/* ─ Étape 2 : Code conciergerie ─ */}
          {step === 2 && (
            <>
              <button onClick={() => { setStep(1); setError(null) }}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-dark mb-4 transition-colors">
                <ArrowLeft size={14} /> Retour
              </button>
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={18} className="text-primary" />
                <h2 className="text-lg font-bold text-dark">Ma conciergerie</h2>
              </div>
              <p className="text-sm text-muted mb-5">
                Entrez le code fourni par votre concierge pour rejoindre son espace.
              </p>
              <form onSubmit={handleStep2} className="space-y-4">
                {error && <ErrorBox msg={error} />}
                <div>
                  <label className="block text-sm font-medium text-dark mb-1.5">
                    Code de conciergerie
                  </label>
                  <input
                    type="text"
                    value={conciergeCode}
                    onChange={e => setConciergeCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    required maxLength={8}
                    placeholder="Ex : A7B3X9"
                    className={`${inputCls} tracking-widest text-center text-xl font-bold`}
                  />
                  <p className="text-xs text-muted mt-1.5">
                    Code de 6 caractères — disponible dans Paramètres de l'espace admin
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading || conciergeCode.length < 4}
                  className={btnPrimary}>
                  {loading ? <LoadingLabel label="Vérification…" /> : 'Vérifier le code'}
                </button>
              </form>
            </>
          )}

          {/* ─ Étape 3 : Mon équipe ─ */}
          {step === 3 && conciergeProfile && (
            <>
              <button onClick={() => { setStep(2); setError(null); setConciergeProfile(null) }}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-dark mb-4 transition-colors">
                <ArrowLeft size={14} /> Retour
              </button>

              {/* Confirmation conciergerie */}
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 mb-5">
                <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-green-700 font-medium">Conciergerie trouvée ✓</p>
                  <p className="text-sm font-bold text-green-800">{conciergeProfile.company_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <Users size={18} className="text-primary" />
                <h2 className="text-lg font-bold text-dark">Mon équipe</h2>
              </div>
              <p className="text-sm text-muted mb-4">
                Créez votre équipe ou rejoignez-en une avec le code d'un collègue.
              </p>

              {/* Toggle créer / rejoindre */}
              <div className="flex bg-bg rounded-xl p-1 mb-5 border border-border">
                {(['create', 'join'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTeamMode(mode)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      teamMode === mode
                        ? 'bg-surface shadow-sm text-dark'
                        : 'text-muted hover:text-dark'
                    }`}
                  >
                    {mode === 'create' ? '✦ Créer une équipe' : '→ Rejoindre'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleStep3} className="space-y-4">
                {error && <ErrorBox msg={error} />}

                {teamMode === 'create' ? (
                  <div>
                    <label className="block text-sm font-medium text-dark mb-1.5">
                      Nom de l'équipe
                    </label>
                    <input
                      type="text" value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      required placeholder="Équipe A · Team Paris…"
                      className={inputCls}
                    />
                    <p className="text-xs text-muted mt-1.5">
                      Un code unique sera généré — vos collègues pourront le rejoindre.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-dark mb-1.5">
                      Code d'équipe
                    </label>
                    <input
                      type="text" value={teamCode}
                      onChange={e => setTeamCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      required placeholder="Code partagé par un collègue"
                      className={`${inputCls} tracking-widest text-center font-bold`}
                    />
                  </div>
                )}

                <button type="submit" disabled={loading} className={btnPrimary}>
                  {loading
                    ? <LoadingLabel label="Envoi de la demande…" />
                    : 'Envoyer la demande d\'accès'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6">
          Déjà un compte ?{' '}
          <button onClick={() => navigate('/login')} className="text-primary hover:underline font-medium">
            Se connecter
          </button>
        </p>

        <p className="text-center text-xs text-muted mt-2">CleanPilot by StayPilot — v1.0</p>
      </div>
    </div>
  )
}
