import React, { useState } from 'react'
import { Settings, Eye, EyeOff, CheckCircle, FlaskConical, PlayCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { resetTour } from '../components/OnboardingTour'

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

export default function Parametres() {
  const [saved, setSaved] = useState(false)
  const [selectedFont, setSelectedFont] = useState<string>(
    () => localStorage.getItem('staypilot_font') ?? 'Inter'
  )

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

  const handleSave = () => {
    // In production: call API to update env / client config
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-2xl space-y-5">
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
      </Section>

      <Section title="Intégrations">
        <Field label="Clé API Superhote" value={config.superhoteApiKey} onChange={set('superhoteApiKey')}
          placeholder="sk-..." secret
          hint="Disponible dans Superhote → Paramètres → API" />
        <Field label="Numéro Twilio (SMS/WhatsApp)" value={config.twilioFrom} onChange={set('twilioFrom')}
          placeholder="+33XXXXXXXXX" hint="Twilio → Phone Numbers" />
        <Field label="Email expéditeur SendGrid" value={config.sendgridFrom} onChange={set('sendgridFrom')}
          placeholder="noreply@maconciergerie.fr" hint="Doit être vérifié dans SendGrid" />
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
