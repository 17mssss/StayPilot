import React, { useState, useEffect } from 'react'
import { Settings, Eye, EyeOff, CheckCircle, FlaskConical, PlayCircle, Copy, Check, RefreshCw, Pencil, X, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { resetTour } from '../components/OnboardingTour'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ── Génération de code ────────────────────────────────────────────────────────

function genCode(n = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < n; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// ── Composants ────────────────────────────────────────────────────────────────

const FONTS = [
  { id: 'Inter',        label: 'Inter',         preview: 'Aa',  desc: 'Moderne · Par défaut' },
  { id: 'DM Sans',      label: 'DM Sans',        preview: 'Aa',  desc: 'Minimaliste · Épuré' },
  { id: 'Poppins',      label: 'Poppins',        preview: 'Aa',  desc: 'Arrondi · Convivial' },
  { id: 'Lato',         label: 'Lato',           preview: 'Aa',  desc: 'Classique · Lisible' },
  { id: 'Merriweather', label: 'Merriweather',   preview: 'Aa',  desc: 'Serif · Élégant' },
  { id: 'Fira Code',    label: 'Fira Code',      preview: 'Aa',  desc: 'Monospace · Technique' },
]

interface FieldProps {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; secret?: boolean; hint?: string
}

function Field({ label, value, onChange, placeholder, secret, hint }: FieldProps) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium text-dark mb-1">{label}</label>
      {hint && <p className="text-xs text-muted mb-1.5">{hint}</p>}
      <div className="relative">
        <input
          type={secret && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary pr-9 font-mono bg-bg text-dark placeholder:text-muted transition-colors"
        />
        {secret && (
          <button type="button" onClick={() => setShow((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-dark">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl shadow-card p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-dark mb-4 pb-3 border-b border-border">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

// ── Code conciergerie ─────────────────────────────────────────────────────────

function ConciergeCodeSection({
  conciergeCode,
  onRegenerate,
  regenerating,
}: {
  conciergeCode: string
  onRegenerate: () => void
  regenerating: boolean
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(conciergeCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-dark mb-1">
          Code de la conciergerie
        </label>
        <p className="text-xs text-muted mb-2">
          Transmettez ce code à vos agents de ménage pour qu'ils puissent rejoindre votre espace CleanPilot.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center justify-center bg-bg border-2 border-dashed border-primary/40 rounded-xl py-3 px-4">
            <span className="text-2xl font-extrabold tracking-[0.3em] text-primary font-mono">
              {conciergeCode || '——————'}
            </span>
          </div>
          <button
            onClick={copy}
            disabled={!conciergeCode}
            className="w-11 h-11 flex items-center justify-center rounded-xl border border-border bg-bg text-muted hover:text-dark hover:border-primary/50 transition-colors disabled:opacity-40"
            title="Copier"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="w-11 h-11 flex items-center justify-center rounded-xl border border-border bg-bg text-muted hover:text-dark hover:border-primary/50 transition-colors disabled:opacity-40"
            title="Régénérer le code"
          >
            <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-xs text-muted mt-2">
          ⚠️ Régénérer invalide l'ancien code — les agents devront utiliser le nouveau.
        </p>
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function Parametres() {
  const { user, session } = useAuth()
  const [saved, setSaved] = useState(false)
  const [selectedFont, setSelectedFont] = useState<string>(
    () => localStorage.getItem('staypilot_font') ?? 'Inter'
  )

  // ── API Keys (depuis backend) ─────────────────────────────────────────────
  const [apiKeys, setApiKeys] = useState({
    sendgrid_api_key: '', sendgrid_from_email: '', sendgrid_from_name: '',
    twilio_account_sid: '', twilio_auth_token: '', twilio_from_number: '',
    anthropic_api_key: '',
    whatsapp_token: '', whatsapp_phone_id: '',
    airbnb_client_id: '', airbnb_client_secret: '',
    booking_api_key: '', booking_property_id: '',
    superhote_api_key: '',
  })
  const [apiKeysSaving, setApiKeysSaving] = useState(false)
  const [apiKeysMsg, setApiKeysMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    import('../lib/api').then(({ default: api }) => {
      api.get('/api/settings').then(r => {
        if (r.data?.data) setApiKeys(prev => ({ ...prev, ...r.data.data }))
      }).catch(() => {})
    })
  }, [user])

  const handleSaveApiKeys = async () => {
    setApiKeysSaving(true)
    setApiKeysMsg(null)
    try {
      const { default: api } = await import('../lib/api')
      await api.post('/api/settings', apiKeys)
      setApiKeysMsg({ type: 'ok', text: 'Clés API sauvegardées ✓' })
    } catch (e: unknown) {
      setApiKeysMsg({ type: 'err', text: (e as Error).message ?? 'Erreur' })
    } finally {
      setApiKeysSaving(false)
    }
  }

  // ── Édition du compte ─────────────────────────────────────────────────────
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileFirstName, setProfileFirstName] = useState('')
  const [profileLastName, setProfileLastName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [editingPassword, setEditingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Profil conciergerie (Supabase)
  const [conciergeProfileId, setConciergeProfileId] = useState<string | null>(null)
  const [conciergeCode, setConciergeCode] = useState('')
  const [conciergeLoading, setConciergeLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  const applyFont = (fontId: string) => {
    setSelectedFont(fontId)
    localStorage.setItem('staypilot_font', fontId)
    document.documentElement.style.setProperty('--app-font', `'${fontId}'`)
  }

  const [config, setConfig] = useState({
    clientName:         import.meta.env.VITE_CLIENT_NAME ?? '',
    clientPhone:        import.meta.env.VITE_CLIENT_PHONE ?? '',
    clientAddress:      import.meta.env.VITE_CLIENT_ADDRESS ?? '',
    clientSiret:        import.meta.env.VITE_CLIENT_SIRET ?? '',
    commissionRate:     import.meta.env.VITE_COMMISSION_RATE ?? '20',
    superhoteApiKey:    '',
    twilioFrom:         '',
    sendgridFrom:       '',
  })

  const set = (key: string) => (v: string) => setConfig((c) => ({ ...c, [key]: v }))

  // ── Chargement du profil conciergerie ─────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const loadProfile = async () => {
      setConciergeLoading(true)

      const { data, error } = await supabase
        .from('concierge_profiles')
        .select('id, company_name, concierge_code')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Erreur chargement profil conciergerie:', error)
        setConciergeLoading(false)
        return
      }

      if (data) {
        setConciergeProfileId(data.id)
        setConciergeCode(data.concierge_code)
        setConfig(c => ({ ...c, clientName: data.company_name || c.clientName }))
      } else {
        // Créer un profil initial avec un code auto-généré
        const newCode = genCode(6)
        const { data: created, error: createErr } = await supabase
          .from('concierge_profiles')
          .insert({
            user_id: user.id,
            company_name: config.clientName || 'Ma Conciergerie',
            concierge_code: newCode,
          })
          .select('id, concierge_code')
          .single()

        if (!createErr && created) {
          setConciergeProfileId(created.id)
          setConciergeCode(created.concierge_code)
        }
      }

      setConciergeLoading(false)
    }

    loadProfile()
  }, [user])

  // ── Régénérer le code conciergerie ────────────────────────────────────────
  const handleRegenerate = async () => {
    if (!conciergeProfileId) return
    setRegenerating(true)
    const newCode = genCode(6)
    const { error } = await supabase
      .from('concierge_profiles')
      .update({ concierge_code: newCode })
      .eq('id', conciergeProfileId)

    if (!error) setConciergeCode(newCode)
    setRegenerating(false)
  }

  // ── Sauvegarde globale ────────────────────────────────────────────────────
  const handleSave = async () => {
    // Mettre à jour le nom de la conciergerie dans Supabase
    if (user && conciergeProfileId) {
      await supabase
        .from('concierge_profiles')
        .update({ company_name: config.clientName })
        .eq('id', conciergeProfileId)
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const firstName = user?.user_metadata?.first_name ?? ''
  const lastName  = user?.user_metadata?.last_name  ?? ''

  // Initialiser les champs profil à l'ouverture du mode édition
  const startEditProfile = () => {
    setProfileFirstName(firstName)
    setProfileLastName(lastName)
    setProfileEmail(user?.email ?? '')
    setProfileMsg(null)
    setEditingProfile(true)
  }

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      const updates: Record<string, unknown> = {
        data: { first_name: profileFirstName, last_name: profileLastName },
      }
      if (profileEmail !== user?.email) updates.email = profileEmail
      const { error } = await supabase.auth.updateUser(updates as Parameters<typeof supabase.auth.updateUser>[0])
      if (error) throw error
      setProfileMsg({ type: 'ok', text: profileEmail !== user?.email ? 'Profil mis à jour. Vérifiez votre nouvelle adresse email pour confirmer.' : 'Profil mis à jour ✓' })
      setEditingProfile(false)
    } catch (e: unknown) {
      setProfileMsg({ type: 'err', text: (e as Error).message ?? 'Erreur lors de la mise à jour' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas.' })
      return
    }
    if (newPassword.length < 8) {
      setPwdMsg({ type: 'err', text: 'Le mot de passe doit faire au moins 8 caractères.' })
      return
    }
    setPwdSaving(true)
    setPwdMsg(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPwdMsg({ type: 'ok', text: 'Mot de passe mis à jour ✓' })
      setEditingPassword(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: unknown) {
      setPwdMsg({ type: 'err', text: (e as Error).message ?? 'Erreur lors de la mise à jour' })
    } finally {
      setPwdSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-5">

      {/* ── Mon compte ── */}
      <Section title="Mon compte">
        {!editingProfile ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Prénom</label>
                <p className="text-sm font-semibold text-dark bg-bg border border-border rounded-lg px-3 py-2.5">
                  {firstName || <span className="text-muted italic">—</span>}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Nom</label>
                <p className="text-sm font-semibold text-dark bg-bg border border-border rounded-lg px-3 py-2.5">
                  {lastName || <span className="text-muted italic">—</span>}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Email</label>
              <p className="text-sm font-semibold text-dark bg-bg border border-border rounded-lg px-3 py-2.5 font-mono">
                {user?.email ?? '—'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Identifiant compte</label>
              <p className="text-xs text-muted bg-bg border border-border rounded-lg px-3 py-2.5 font-mono truncate">
                {user?.id ?? '—'}
              </p>
            </div>
            {profileMsg && (
              <p className={`text-sm ${profileMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{profileMsg.text}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={startEditProfile}
                className="flex items-center gap-1.5 text-sm text-primary border border-primary/30 rounded-lg px-3 py-2 hover:bg-primary-light transition-colors">
                <Pencil size={13} /> Modifier le profil
              </button>
              <button onClick={() => { setEditingPassword(p => !p); setPwdMsg(null) }}
                className="flex items-center gap-1.5 text-sm text-muted border border-border rounded-lg px-3 py-2 hover:bg-bg transition-colors">
                <Eye size={13} /> Changer le mot de passe
              </button>
            </div>
            {editingPassword && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="8 caractères minimum"
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-bg text-dark pr-9"
                    />
                    <button type="button" onClick={() => setShowNewPwd(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">
                      {showNewPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-bg text-dark"
                  />
                </div>
                {pwdMsg && (
                  <p className={`text-sm ${pwdMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{pwdMsg.text}</p>
                )}
                <div className="flex gap-2">
                  <button onClick={handleSavePassword} disabled={pwdSaving}
                    className="flex items-center gap-1.5 text-sm bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-dark transition-colors disabled:opacity-60">
                    {pwdSaving ? 'Sauvegarde…' : <><Save size={13} /> Enregistrer</>}
                  </button>
                  <button onClick={() => { setEditingPassword(false); setNewPassword(''); setConfirmPassword(''); setPwdMsg(null) }}
                    className="flex items-center gap-1.5 text-sm text-muted border border-border rounded-lg px-3 py-2 hover:bg-bg">
                    <X size={13} /> Annuler
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Prénom</label>
                <input value={profileFirstName} onChange={e => setProfileFirstName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-bg text-dark" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Nom</label>
                <input value={profileLastName} onChange={e => setProfileLastName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-bg text-dark" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Email</label>
              <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary bg-bg text-dark font-mono" />
              <p className="text-xs text-muted mt-1">Un email de confirmation sera envoyé si vous changez l'adresse.</p>
            </div>
            {profileMsg && (
              <p className={`text-sm ${profileMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{profileMsg.text}</p>
            )}
            <div className="flex gap-2">
              <button onClick={handleSaveProfile} disabled={profileSaving}
                className="flex items-center gap-1.5 text-sm bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-dark transition-colors disabled:opacity-60">
                {profileSaving ? 'Sauvegarde…' : <><Save size={13} /> Enregistrer</>}
              </button>
              <button onClick={() => { setEditingProfile(false); setProfileMsg(null) }}
                className="flex items-center gap-1.5 text-sm text-muted border border-border rounded-lg px-3 py-2 hover:bg-bg">
                <X size={13} /> Annuler
              </button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Apparence">
        <div>
          <label className="block text-sm font-medium text-dark mb-3">Police d'écriture</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FONTS.map((font) => {
              const isSelected = selectedFont === font.id
              return (
                <button
                  key={font.id}
                  onClick={() => applyFont(font.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center ${
                    isSelected
                      ? 'border-primary bg-primary-light'
                      : 'border-border hover:border-primary/40 hover:bg-border-light'
                  }`}
                >
                  <span
                    className="text-3xl font-semibold text-dark leading-none"
                    style={{ fontFamily: `'${font.id}', sans-serif` }}
                  >
                    {font.preview}
                  </span>
                  <div>
                    <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-primary' : 'text-dark'}`}
                      style={{ fontFamily: `'${font.id}', sans-serif` }}>
                      {font.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{font.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted mt-3">
            La police s'applique immédiatement à toute l'interface.
          </p>
        </div>
      </Section>

      <Section title="Identité de la conciergerie">
        <Field label="Nom de la conciergerie" value={config.clientName} onChange={set('clientName')} placeholder="Ma Conciergerie" />
        <Field label="Téléphone" value={config.clientPhone} onChange={set('clientPhone')} placeholder="+33 6 00 00 00 00" />
        <Field label="Adresse" value={config.clientAddress} onChange={set('clientAddress')} placeholder="12 rue de la Paix, 75001 Paris" />
        <Field label="SIRET" value={config.clientSiret} onChange={set('clientSiret')} placeholder="123 456 789 00012" />
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Taux de commission (%)</label>
          <div className="flex items-center gap-2">
            <input type="number" min={0} max={100} value={config.commissionRate} onChange={(e) => set('commissionRate')(e.target.value)}
              className="w-24 border border-border rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg text-dark transition-colors" />
            <span className="text-sm text-muted">% appliqué sur les revenus</span>
          </div>
        </div>

        {/* ── Code CleanPilot ── */}
        <div className="pt-3 border-t border-border">
          {conciergeLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <RefreshCw size={14} className="animate-spin" /> Chargement du code…
            </div>
          ) : (
            <ConciergeCodeSection
              conciergeCode={conciergeCode}
              onRegenerate={handleRegenerate}
              regenerating={regenerating}
            />
          )}
        </div>
      </Section>

      <Section title="Intégrations & clés API">
        <p className="text-xs text-muted -mt-1">Ces clés sont stockées de façon sécurisée et ne sont jamais affichées en clair après sauvegarde.</p>

        <div className="border-b border-border pb-4 space-y-3">
          <p className="text-xs font-semibold text-dark uppercase tracking-wide">📧 SendGrid (emails)</p>
          <Field label="Clé API SendGrid" value={apiKeys.sendgrid_api_key}
            onChange={v => setApiKeys(p => ({ ...p, sendgrid_api_key: v }))} secret
            placeholder="SG.xxxxxxxx" hint="Disponible sur sendgrid.com → Settings → API Keys" />
          <Field label="Email expéditeur" value={apiKeys.sendgrid_from_email}
            onChange={v => setApiKeys(p => ({ ...p, sendgrid_from_email: v }))}
            placeholder="noreply@maconciergerie.fr" hint="Doit être vérifié dans SendGrid" />
          <Field label="Nom expéditeur" value={apiKeys.sendgrid_from_name}
            onChange={v => setApiKeys(p => ({ ...p, sendgrid_from_name: v }))}
            placeholder="Ma Conciergerie" />
        </div>

        <div className="border-b border-border pb-4 space-y-3">
          <p className="text-xs font-semibold text-dark uppercase tracking-wide">💬 Twilio (SMS)</p>
          <Field label="Account SID" value={apiKeys.twilio_account_sid}
            onChange={v => setApiKeys(p => ({ ...p, twilio_account_sid: v }))} secret placeholder="ACxxxxxxxx" />
          <Field label="Auth Token" value={apiKeys.twilio_auth_token}
            onChange={v => setApiKeys(p => ({ ...p, twilio_auth_token: v }))} secret placeholder="xxxxxxxx" />
          <Field label="Numéro expéditeur" value={apiKeys.twilio_from_number}
            onChange={v => setApiKeys(p => ({ ...p, twilio_from_number: v }))} placeholder="+33XXXXXXXXX" />
        </div>

        <div className="border-b border-border pb-4 space-y-3">
          <p className="text-xs font-semibold text-dark uppercase tracking-wide">🤖 Anthropic / IA</p>
          <Field label="Clé API Anthropic" value={apiKeys.anthropic_api_key}
            onChange={v => setApiKeys(p => ({ ...p, anthropic_api_key: v }))} secret
            placeholder="sk-ant-xxxxxxxx" hint="Disponible sur console.anthropic.com" />
        </div>

        <div className="border-b border-border pb-4 space-y-3">
          <p className="text-xs font-semibold text-dark uppercase tracking-wide">🏨 Superhote</p>
          <Field label="Clé API Superhote" value={apiKeys.superhote_api_key}
            onChange={v => setApiKeys(p => ({ ...p, superhote_api_key: v }))} secret
            placeholder="sk-..." hint="Superhote → Paramètres → API" />
        </div>

        {apiKeysMsg && (
          <p className={`text-sm ${apiKeysMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{apiKeysMsg.text}</p>
        )}
        <button onClick={handleSaveApiKeys} disabled={apiKeysSaving}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60">
          {apiKeysSaving ? 'Sauvegarde…' : 'Sauvegarder les intégrations'}
        </button>
      </Section>

      <Section title="Outils développeur">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-dark">Page de simulation</p>
            <p className="text-xs text-muted">Tester les intégrations sans données réelles</p>
          </div>
          <Link to="/simulation"
            className="flex items-center gap-2 text-sm text-primary border border-primary/30 rounded-lg px-3 py-2 hover:bg-primary-light transition-colors">
            <FlaskConical size={14} /> Ouvrir
          </Link>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-border">
          <div>
            <p className="text-sm font-medium text-dark">Templates de messages</p>
            <p className="text-xs text-muted">Gérer les messages automatiques envoyés aux voyageurs</p>
          </div>
          <Link to="/templates"
            className="flex items-center gap-2 text-sm text-primary border border-primary/30 rounded-lg px-3 py-2 hover:bg-primary-light transition-colors">
            <Settings size={14} /> Gérer
          </Link>
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <button onClick={handleSave}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors">
          Enregistrer les paramètres
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle size={16} />
            Paramètres sauvegardés
          </div>
        )}
      </div>

      <div className="text-xs text-muted">
        Note : Les clés API sensibles (Supabase, Twilio, SendGrid, Anthropic) doivent être configurées
        directement dans le fichier <code className="font-mono bg-bg px-1 py-0.5 rounded">.env</code> sur le serveur
        et ne sont pas modifiables depuis cette interface pour des raisons de sécurité.
      </div>

      {/* Relancer le tutoriel */}
      <div className="flex items-center justify-between bg-surface border border-border rounded-xl px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-dark">Tutoriel de prise en main</p>
          <p className="text-xs text-muted mt-0.5">Relancez le tour guidé pour redécouvrir toutes les fonctionnalités</p>
        </div>
        <button onClick={resetTour}
          className="flex items-center gap-2 text-sm text-primary border border-primary/30 bg-primary-light hover:bg-primary hover:text-white rounded-lg px-4 py-2 font-medium transition-colors">
          <PlayCircle size={15} /> Relancer le tutoriel
        </button>
      </div>
    </div>
  )
}
