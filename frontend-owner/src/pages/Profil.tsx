import React, { useEffect, useState } from 'react'
import { User, Bell, Save, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

interface OwnerProfile {
  first_name: string
  last_name: string
  email: string
  phone: string
  iban: string
  notification_preferences: {
    email_new_reservation: boolean
    email_cancellation: boolean
    email_payment: boolean
    sms_new_reservation: boolean
    sms_cancellation: boolean
  }
}

const DEFAULT_PREFS = {
  email_new_reservation: true,
  email_cancellation: true,
  email_payment: true,
  sms_new_reservation: false,
  sms_cancellation: false,
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
        checked ? 'bg-primary' : 'bg-gray-200'
      }`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`} />
    </button>
  )
}

export default function Profil() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<OwnerProfile>({
    first_name: '', last_name: '', email: user?.email ?? '',
    phone: '', iban: '', notification_preferences: DEFAULT_PREFS,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<OwnerProfile>('/api/owner/profile')
      .then(r => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      await api.put('/api/owner/profile', profile)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Échec de la mise à jour. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof Omit<OwnerProfile, 'notification_preferences'>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setProfile(p => ({ ...p, [key]: e.target.value }))

  const setPref = (key: keyof OwnerProfile['notification_preferences']) => (v: boolean) =>
    setProfile(p => ({ ...p, notification_preferences: { ...p.notification_preferences, [key]: v } }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Identity */}
      <div className="bg-surface rounded-xl shadow-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <User size={16} className="text-muted" />
          <h2 className="text-sm font-semibold text-dark">Informations personnelles</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Prénom</label>
            <input value={profile.first_name} onChange={set('first_name')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-bg text-dark"
              placeholder="Votre prénom" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Nom</label>
            <input value={profile.last_name} onChange={set('last_name')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-bg text-dark"
              placeholder="Votre nom" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Adresse email</label>
            <input value={profile.email} onChange={set('email')} type="email"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-bg text-dark"
              placeholder="email@exemple.fr" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Téléphone</label>
            <input value={profile.phone} onChange={set('phone')} type="tel"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-bg text-dark"
              placeholder="+33 6 00 00 00 00" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted mb-1.5">IBAN (pour les virements)</label>
            <input value={profile.iban} onChange={set('iban')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-bg text-dark font-mono"
              placeholder="FR76 0000 0000 0000 0000 0000 000" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-surface rounded-xl shadow-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell size={16} className="text-muted" />
          <h2 className="text-sm font-semibold text-dark">Préférences de notifications</h2>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Par email</p>
          {[
            { key: 'email_new_reservation' as const, label: 'Nouvelle réservation' },
            { key: 'email_cancellation' as const, label: 'Annulation de réservation' },
            { key: 'email_payment' as const, label: 'Versement reçu' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-dark">{label}</span>
              <Toggle checked={profile.notification_preferences[key]} onChange={setPref(key)} />
            </div>
          ))}
        </div>

        <div className="space-y-1 mt-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Par SMS</p>
          {[
            { key: 'sms_new_reservation' as const, label: 'Nouvelle réservation' },
            { key: 'sms_cancellation' as const, label: 'Annulation de réservation' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-dark">{label}</span>
              <Toggle checked={profile.notification_preferences[key]} onChange={setPref(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-4 py-2.5">
          <CheckCircle size={15} />
          Profil mis à jour avec succès.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60">
          {saving
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Save size={15} />}
          Enregistrer les modifications
        </button>
      </div>
    </form>
  )
}
