import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Eye } from 'lucide-react'
import api from '../lib/api'
import Select from '../components/Select'

interface Template {
  id: string
  name: string
  trigger: string
  channel: string
  subject?: string
  body: string
  delay_hours?: number
  is_active?: boolean
}

const TRIGGERS = [
  { value: 'j-2', label: 'J-2 avant check-in' },
  { value: 'j-1', label: 'J-1 avant check-in' },
  { value: 'checkin', label: 'Jour du check-in' },
  { value: 'checkout', label: 'Jour du check-out' },
  { value: 'j+1', label: 'J+1 après check-out' },
  { value: 'booking_confirmed', label: 'Réservation confirmée' },
  { value: 'review_request', label: 'Demande d\'avis' },
]

const CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'platform', label: 'Plateforme' },
]

const VARIABLES = [
  '{{prenom_voyageur}}',
  '{{nom_logement}}',
  '{{date_checkin}}',
  '{{date_checkout}}',
  '{{adresse_logement}}',
  '{{code_acces}}',
]

const TRIGGER_LABELS: Record<string, string> = {
  'j-2': 'J-2',
  'j-1': 'J-1',
  checkin: 'Check-in',
  checkout: 'Check-out',
  'j+1': 'J+1',
  booking_confirmed: 'Confirmation',
  review_request: 'Avis',
}

const TRIGGER_COLORS: Record<string, string> = {
  'j-2': 'bg-blue-100 text-blue-700',
  'j-1': 'bg-indigo-100 text-indigo-700',
  checkin: 'bg-green-100 text-green-700',
  checkout: 'bg-yellow-100 text-yellow-700',
  'j+1': 'bg-purple-100 text-purple-700',
  booking_confirmed: 'bg-teal-100 text-teal-700',
  review_request: 'bg-pink-100 text-pink-700',
}

const defaultForm: Omit<Template, 'id'> = {
  name: '',
  trigger: 'checkin',
  channel: 'email',
  subject: '',
  body: '',
  delay_hours: 0,
  is_active: true,
}

interface ModalProps {
  template: Template | null
  onClose: () => void
  onSave: (data: Omit<Template, 'id'>, id?: string) => Promise<void>
}

function Modal({ template, onClose, onSave }: ModalProps) {
  const [form, setForm] = useState<Omit<Template, 'id'>>(
    template
      ? { name: template.name, trigger: template.trigger, channel: template.channel, subject: template.subject || '', body: template.body, delay_hours: template.delay_hours || 0, is_active: template.is_active !== false }
      : defaultForm
  )
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(form, template?.id)
    setSaving(false)
  }

  const handlePreview = async () => {
    if (!template?.id) return
    setLoadingPreview(true)
    try {
      const res = await api.post<{ preview: string }>(`/api/templates/${template.id}/preview`)
      setPreview((res.data as any)?.preview ?? res.data as unknown as string)
    } catch {
      setPreview('Impossible de prévisualiser pour le moment.')
    }
    setLoadingPreview(false)
  }

  const insertVariable = (v: string) => {
    setForm((f) => ({ ...f, body: f.body + v }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="bg-surface rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="text-lg font-bold text-dark">
            {template ? 'Modifier le template' : 'Nouveau template'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-dark">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-dark mb-1">Nom du template</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg"
                placeholder="Ex: Message de bienvenue J-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">Déclencheur</label>
              <Select
                value={form.trigger}
                onChange={(v) => setForm((f) => ({ ...f, trigger: v }))}
                options={TRIGGERS}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">Canal</label>
              <Select
                value={form.channel}
                onChange={(v) => setForm((f) => ({ ...f, channel: v }))}
                options={CHANNELS}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">Délai (heures)</label>
              <input
                type="number"
                value={form.delay_hours}
                onChange={(e) => setForm((f) => ({ ...f, delay_hours: parseInt(e.target.value) || 0 }))}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg"
                min={0}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-dark">Actif</label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={form.is_active ? { backgroundColor: '#e8611a' } : { backgroundColor: '#e5e7eb' }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {form.channel === 'email' && (
            <div>
              <label className="block text-sm font-medium text-dark mb-1">Sujet de l'email</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg"
                placeholder="Ex: Bienvenue {{prenom_voyageur}} !"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-dark">Contenu du message</label>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="text-xs px-2 py-1 rounded border border-border text-muted hover:bg-bg font-mono"
                >
                  {v}
                </button>
              ))}
            </div>
            <textarea
              required
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={6}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:border-primary bg-bg resize-none font-mono"
              placeholder="Bonjour {{prenom_voyageur}}, votre séjour à {{nom_logement}} commence le {{date_checkin}}..."
            />
          </div>

          {template && (
            <div>
              <button
                type="button"
                onClick={handlePreview}
                disabled={loadingPreview}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 border border-primary text-primary rounded-lg transition hover:bg-primary-light disabled:opacity-50"
              >
                <Eye size={15} />
                {loadingPreview ? 'Chargement...' : 'Prévisualiser'}
              </button>
              {preview && (
                <div className="mt-3 p-4 bg-bg rounded-lg border border-border text-sm text-dark whitespace-pre-wrap">
                  <p className="text-xs font-semibold text-muted uppercase mb-2">Prévisualisation</p>
                  {preview}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border text-dark py-2 rounded-lg text-sm font-medium hover:bg-bg transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
              style={{ backgroundColor: '#e8611a' }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchTemplates = async () => {
    try {
      const res = await api.get<Template[]>('/api/templates')
      setTemplates(res.data)
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTemplates() }, [])

  const handleSave = async (data: Omit<Template, 'id'>, id?: string) => {
    try {
      if (id) {
        await api.patch(`/api/templates/${id}`, data)
      } else {
        await api.post('/api/templates', data)
      }
      await fetchTemplates()
    } catch {
      // silently
    }
    setModalOpen(false)
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/templates/${id}`)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch {
      // silently
    }
    setDeleteConfirm(null)
  }

  const grouped = TRIGGERS.reduce<Record<string, Template[]>>((acc, t) => {
    acc[t.value] = templates.filter((tmpl) => tmpl.trigger === t.value)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">
            Templates
          </h1>
          <p className="text-muted text-sm mt-1">Messages automatiques par déclencheur</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true) }}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
          style={{ backgroundColor: '#e8611a' }}
        >
          <Plus size={16} />
          Nouveau template
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div
            className="w-7 h-7 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#e8611a', borderTopColor: 'transparent' }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {TRIGGERS.map((trigger) => {
            const group = grouped[trigger.value] ?? []
            return (
              <div key={trigger.value}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TRIGGER_COLORS[trigger.value] ?? 'bg-bg text-muted'}`}>
                    {TRIGGER_LABELS[trigger.value]}
                  </span>
                  <span className="text-sm font-medium text-dark">{trigger.label}</span>
                  <span className="text-xs text-muted">({group.length})</span>
                </div>

                {group.length === 0 ? (
                  <div className="bg-surface rounded-xl border border-dashed border-border py-6 text-center">
                    <p className="text-xs text-muted">Aucun template pour ce déclencheur</p>
                    <button
                      onClick={() => { setEditing(null); setModalOpen(true) }}
                      className="mt-1 text-xs font-medium"
                      style={{ color: '#e8611a' }}
                    >
                      Créer un template
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.map((t) => (
                      <div
                        key={t.id}
                        className="bg-surface rounded-xl border border-border p-4 hover:shadow-sm transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-dark">{t.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-bg text-muted capitalize">
                                {t.channel}
                              </span>
                              {!t.is_active && (
                                <span className="text-xs text-muted">Inactif</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => { setEditing(t); setModalOpen(true) }}
                              className="text-muted hover:text-dark p-1"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(t.id)}
                              className="text-muted hover:text-red-500 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {t.subject && (
                          <p className="text-xs text-muted mb-1 font-medium truncate">
                            Sujet : {t.subject}
                          </p>
                        )}
                        <p className="text-xs text-muted line-clamp-2">{t.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <Modal
          template={editing}
          onClose={() => { setModalOpen(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-dark mb-2">Supprimer ce template ?</h3>
            <p className="text-sm text-muted mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-border text-dark py-2 rounded-lg text-sm font-medium hover:bg-bg"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
