import { useState, useRef, useEffect } from 'react'
import { X, Eye, EyeOff, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const avatars = [
  { id: 'pilote-garcon-light',  src: new URL('../assets/avatars/pilote-garcon-light.png',  import.meta.url).href },
  { id: 'pilote-garcon-medium', src: new URL('../assets/avatars/pilote-garcon-medium.png', import.meta.url).href },
  { id: 'pilote-garcon-dark',   src: new URL('../assets/avatars/pilote-garcon-dark.png',   import.meta.url).href },
  { id: 'pilote-femme-light',   src: new URL('../assets/avatars/pilote-femme-light.png',   import.meta.url).href },
  { id: 'pilote-femme-dark',    src: new URL('../assets/avatars/pilote-femme-dark.png',    import.meta.url).href },
]

/** @deprecated — ne plus utiliser localStorage pour l'avatar. Clé conservée pour migration. */
const AVATAR_KEY = 'staypilot_avatar'

export default function AccountPanel() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Avatar — priorité : user_metadata Supabase > localStorage (migration) > défaut
  const [avatar, setAvatar] = useState(() => {
    const fromMeta = user?.user_metadata?.avatar as string | undefined
    if (fromMeta) return fromMeta
    // Migration : récupérer depuis localStorage si présent, puis nettoyer
    const fromStorage = localStorage.getItem(AVATAR_KEY)
    return fromStorage ?? 'pilote-garcon-light'
  })

  // Formulaire
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name ?? '')
  const [lastName,  setLastName]  = useState(user?.user_metadata?.last_name  ?? '')
  const [email,     setEmail]     = useState(user?.email ?? '')
  const [password,  setPassword]  = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [showCpw,   setShowCpw]   = useState(false)

  // États profil
  const [savingProfile,  setSavingProfile]  = useState(false)
  const [successProfile, setSuccessProfile] = useState(false)
  const [errorProfile,   setErrorProfile]   = useState<string | null>(null)

  // États mot de passe
  const [savingPw,  setSavingPw]  = useState(false)
  const [successPw, setSuccessPw] = useState(false)
  const [errorPw,   setErrorPw]   = useState<string | null>(null)

  const currentAvatar = avatars.find((a) => a.id === avatar) ?? avatars[0]

  const displayName = (() => {
    if (firstName || lastName) return [firstName, lastName].filter(Boolean).join(' ')
    return user?.email?.split('@')[0] ?? 'Mon compte'
  })()

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sync user data quand le user change (y compris l'avatar depuis user_metadata)
  useEffect(() => {
    if (user) {
      setFirstName(user.user_metadata?.first_name ?? '')
      setLastName(user.user_metadata?.last_name   ?? '')
      setEmail(user.email ?? '')
      // Synchroniser l'avatar depuis user_metadata si disponible
      if (user.user_metadata?.avatar) {
        setAvatar(user.user_metadata.avatar as string)
        // Nettoyer localStorage (migration vers user_metadata)
        localStorage.removeItem(AVATAR_KEY)
      }
    }
  }, [user])

  const handleAvatarSelect = (id: string) => {
    // Mise à jour locale immédiate pour la réactivité UI
    setAvatar(id)
    // Ne plus stocker en localStorage — sera persisté dans Supabase au prochain handleSaveProfile
  }

  const handleSaveProfile = async () => {
    setErrorProfile(null)
    setSuccessProfile(false)
    setSavingProfile(true)
    try {
      const updates: Record<string, unknown> = {
        // Avatar persisté dans user_metadata (plus de localStorage)
        data: { first_name: firstName, last_name: lastName, avatar },
      }
      if (email && email !== user?.email) updates.email = email
      const { error: supaErr } = await supabase.auth.updateUser(updates)
      if (supaErr) throw new Error(supaErr.message)
      // Migration complète : supprimer la clé localStorage si elle existe encore
      localStorage.removeItem(AVATAR_KEY)
      setSuccessProfile(true)
      setTimeout(() => setSuccessProfile(false), 3000)
    } catch (err: unknown) {
      setErrorProfile(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
    setSavingProfile(false)
  }

  const handleSavePassword = async () => {
    setErrorPw(null)
    setSuccessPw(false)
    if (!password) return
    if (password !== confirmPw) { setErrorPw('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6)    { setErrorPw('Minimum 6 caractères.'); return }
    setSavingPw(true)
    try {
      const { error: supaErr } = await supabase.auth.updateUser({ password })
      if (supaErr) throw new Error(supaErr.message)
      setSuccessPw(true)
      setPassword('')
      setConfirmPw('')
      setTimeout(() => setSuccessPw(false), 3000)
    } catch (err: unknown) {
      setErrorPw(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
    setSavingPw(false)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bouton avatar */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 group focus:outline-none"
      >
        <img
          src={currentAvatar.src}
          alt="Mon avatar"
          className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-110 transition-transform"
        />
        <div className="hidden lg:flex flex-col items-start">
          <span className="text-sm font-bold text-dark leading-tight">{displayName}</span>
          <span className="text-xs text-muted leading-tight">Administrateur</span>
        </div>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-14 z-50 w-80 bg-surface rounded-2xl shadow-xl border border-border overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-dark">Paramètres du compte</p>
            <button onClick={() => setOpen(false)} className="text-muted hover:text-dark transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-5 max-h-[80vh] overflow-y-auto">

            {/* Avatar */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Avatar</p>
              <div className="grid grid-cols-5 gap-2">
                {avatars.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleAvatarSelect(a.id)}
                    className={`flex flex-col items-center rounded-xl p-1.5 transition-all ${
                      avatar === a.id
                        ? 'ring-2 ring-primary bg-primary-light ring-offset-1 ring-offset-surface'
                        : 'hover:bg-border-light'
                    }`}
                  >
                    <img src={a.src} alt="" className="w-14 h-14 object-contain drop-shadow-sm" />
                  </button>
                ))}
              </div>
            </div>

            {/* Infos personnelles */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">Informations</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-dark mb-1">Prénom</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Prénom"
                    className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-muted transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark mb-1">Nom</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    placeholder="Nom"
                    className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-muted transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark mb-1">Adresse email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder:text-muted transition-colors" />
              </div>
              {errorProfile && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                  <AlertCircle size={13} className="flex-shrink-0" />{errorProfile}
                </div>
              )}
              {successProfile && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                  <CheckCircle size={13} className="flex-shrink-0" />Profil mis à jour
                </div>
              )}
              <button onClick={handleSaveProfile} disabled={savingProfile}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60">
                {savingProfile ? <Loader2 size={13} className="animate-spin" /> : null}
                {savingProfile ? 'Enregistrement…' : 'Enregistrer le profil'}
              </button>
            </div>

            {/* Mot de passe */}
            <div className="space-y-3 pt-1 border-t border-border">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide pt-3">Changer le mot de passe</p>
              <div>
                <label className="block text-xs font-medium text-dark mb-1">Nouveau mot de passe</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:border-primary placeholder:text-muted transition-colors" />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark mb-1">Confirmer</label>
                <div className="relative">
                  <input type={showCpw ? 'text' : 'password'} value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••"
                    className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:border-primary placeholder:text-muted transition-colors" />
                  <button type="button" onClick={() => setShowCpw(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
                    {showCpw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              {errorPw && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                  <AlertCircle size={13} className="flex-shrink-0" />{errorPw}
                </div>
              )}
              {successPw && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                  <CheckCircle size={13} className="flex-shrink-0" />Mot de passe modifié
                </div>
              )}
              <button onClick={handleSavePassword} disabled={savingPw || !password}
                className="w-full flex items-center justify-center gap-2 bg-dark hover:bg-dark/80 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-40">
                {savingPw ? <Loader2 size={13} className="animate-spin" /> : null}
                {savingPw ? 'Modification…' : 'Changer le mot de passe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
