import React, { useEffect, useState } from 'react'
import {
  Users, Plus, Pencil, Trash2, Building2, Mail, MapPin,
  X, Loader2, Check, Search, ChevronDown, ChevronUp,
} from 'lucide-react'
import api from '../lib/api'

interface Logement { id: string; name?: string; nom?: string }
interface Proprietaire {
  id: string
  nom: string
  email?: string | null
  adresse?: string | null
  logement_ids?: string[]
  created_at?: string
}

const emptyForm = (): Omit<Proprietaire, 'id' | 'created_at'> => ({
  nom: '', email: '', adresse: '', logement_ids: [],
})

function Modal({
  title, onClose, children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-surface rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <p className="font-semibold text-dark">{title}</p>
          <button onClick={onClose} className="text-muted hover:text-dark transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

function ProprietaireForm({
  initial,
  logements,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: Omit<Proprietaire, 'id' | 'created_at'>
  logements: Logement[]
  onSave: (data: Omit<Proprietaire, 'id' | 'created_at'>) => void
  onCancel: () => void
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)

  const toggleLogement = (id: string) =>
    setForm((f) => ({
      ...f,
      logement_ids: f.logement_ids?.includes(id)
        ? f.logement_ids.filter((x) => x !== id)
        : [...(f.logement_ids ?? []), id],
    }))

  const field = (key: keyof typeof form) => (
    <input
      value={(form[key] as string) ?? ''}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary placeholder:text-muted transition-colors"
    />
  )

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-dark mb-1">Nom *</label>
        {field('nom')}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-dark mb-1">Email</label>
          <input
            type="email"
            value={form.email ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full border border-border bg-bg text-dark rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary placeholder:text-muted transition-colors"
            placeholder="jean@exemple.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-dark mb-1">Adresse</label>
          {field('adresse')}
        </div>
      </div>
      {logements.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-dark mb-2">Logements associés</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {logements.map((l) => {
              const name = l.name ?? l.nom ?? l.id
              const selected = form.logement_ids?.includes(l.id)
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleLogement(l.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    selected
                      ? 'bg-primary text-white'
                      : 'bg-bg border border-border text-dark hover:border-primary'
                  }`}
                >
                  <Building2 size={13} className="flex-shrink-0" />
                  <span className="truncate">{name}</span>
                  {selected && <Check size={12} className="ml-auto flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          <X size={12} className="flex-shrink-0" />{error}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.nom.trim()}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 text-sm text-muted border border-border rounded-lg hover:bg-bg transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

export default function Proprietaires() {
  const [proprietaires, setProprietaires] = useState<Proprietaire[]>([])
  const [logements, setLogements] = useState<Logement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Proprietaire | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Proprietaire | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/proprietaires').then((r) => Array.isArray(r.data) ? r.data : []).catch(() => []),
      api.get('/api/logements').then((r) => {
        const list = Array.isArray(r.data) ? r.data : []
        return list.map((l: any) => ({ id: l.id, name: l.name ?? l.nom ?? l.id }))
      }).catch(() => []),
    ]).then(([props, logs]) => {
      setProprietaires(props)
      setLogements(logs)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = proprietaires.filter((p) => {
    const q = search.toLowerCase()
    return !q || p.nom.toLowerCase().includes(q) || (p.email ?? '').toLowerCase().includes(q)
  })

  const handleCreate = async (data: Omit<Proprietaire, 'id' | 'created_at'>) => {
    if (!data.nom.trim()) { setFormError('Le nom est requis.'); return }
    setSaving(true); setFormError(null)
    try {
      const res = await api.post('/api/proprietaires', {
        nom: data.nom.trim(),
        email: data.email?.trim() || undefined,
        adresse: data.adresse?.trim() || undefined,
        logement_ids: data.logement_ids ?? [],
      })
      const created = (res.data as any)?.data ?? res.data
      setProprietaires((prev) => [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)))
      setShowModal(null)
    } catch (e: any) {
      setFormError(e?.response?.data?.error ?? 'Erreur lors de la création.')
    }
    setSaving(false)
  }

  const handleEdit = async (data: Omit<Proprietaire, 'id' | 'created_at'>) => {
    if (!editing) return
    if (!data.nom.trim()) { setFormError('Le nom est requis.'); return }
    setSaving(true); setFormError(null)
    try {
      const res = await api.patch(`/api/proprietaires/${editing.id}`, {
        nom: data.nom.trim(),
        email: data.email?.trim() || null,
        adresse: data.adresse?.trim() || null,
        logement_ids: data.logement_ids ?? [],
      })
      const updated = (res.data as any)?.data ?? res.data
      setProprietaires((prev) => prev.map((p) => p.id === editing.id ? updated : p))
      setShowModal(null)
      setEditing(null)
    } catch (e: any) {
      setFormError(e?.response?.data?.error ?? 'Erreur lors de la modification.')
    }
    setSaving(false)
  }

  const handleDelete = async (p: Proprietaire) => {
    setDeletingId(p.id)
    try {
      await api.delete(`/api/proprietaires/${p.id}`)
      setProprietaires((prev) => prev.filter((x) => x.id !== p.id))
    } catch {}
    setDeletingId(null)
    setConfirmDelete(null)
  }

  const openEdit = (p: Proprietaire) => {
    setEditing(p)
    setFormError(null)
    setShowModal('edit')
  }

  const logementName = (id: string) => {
    const l = logements.find((x) => x.id === id)
    return l?.name ?? l?.nom ?? id.slice(0, 8)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted">{proprietaires.length} propriétaire{proprietaires.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => { setFormError(null); setShowModal('create') }}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Nouveau propriétaire
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          className="w-full pl-9 pr-4 border border-border bg-surface rounded-lg px-3 py-3 text-base sm:text-sm focus:outline-none focus:border-primary placeholder:text-muted text-dark transition-colors"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-xl shadow-card flex flex-col items-center justify-center h-48 gap-3">
          <Users size={36} className="text-muted opacity-40" />
          <p className="text-sm text-muted">
            {search ? `Aucun résultat pour "${search}"` : 'Aucun propriétaire enregistré'}
          </p>
          {!search && (
            <button
              onClick={() => setShowModal('create')}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <Plus size={12} /> Créer le premier propriétaire
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-xl shadow-card overflow-hidden divide-y divide-border-light">
          {filtered.map((p) => {
            const isExpanded = expandedId === p.id
            const lids = p.logement_ids ?? []
            return (
              <div key={p.id}>
                <div className="flex items-center px-5 py-4 hover:bg-bg transition-colors gap-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                    {p.nom[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-dark truncate">{p.nom}</p>
                    <div className="flex items-center gap-4 mt-0.5 flex-wrap">
                      {p.email && (
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <Mail size={11} />{p.email}
                        </span>
                      )}
                      {p.adresse && (
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <MapPin size={11} />{p.adresse}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Logements badge */}
                  {lids.length > 0 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className="flex items-center gap-1.5 text-xs text-muted hover:text-dark border border-border rounded-lg px-2.5 py-1.5 transition-colors flex-shrink-0"
                    >
                      <Building2 size={12} />
                      {lids.length} logement{lids.length > 1 ? 's' : ''}
                      {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(p)}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-muted hover:text-dark hover:bg-bg transition-colors"
                      title="Modifier"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(p)}
                      disabled={deletingId === p.id}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                      title="Supprimer"
                    >
                      {deletingId === p.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                {/* Logements expand */}
                {isExpanded && lids.length > 0 && (
                  <div className="px-5 pb-4 pt-0 bg-bg">
                    <div className="flex flex-wrap gap-2">
                      {lids.map((id) => (
                        <span key={id} className="flex items-center gap-1.5 text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 text-dark">
                          <Building2 size={11} className="text-muted" />
                          {logementName(id)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Info card */}
      <div className="mt-5 bg-primary-light border border-orange-100 rounded-xl p-4">
        <p className="text-sm font-semibold text-primary mb-1">Utilisation des propriétaires</p>
        <p className="text-xs text-orange-700">
          Les propriétaires sont utilisés pour générer les relevés mensuels dans l'onglet "Facturation → Générer facture → Relevé mensuel".
          Associez les logements à chaque propriétaire pour un calcul automatique des revenus.
        </p>
      </div>

      {/* Create modal */}
      {showModal === 'create' && (
        <Modal title="Nouveau propriétaire" onClose={() => setShowModal(null)}>
          <ProprietaireForm
            initial={emptyForm()}
            logements={logements}
            onSave={handleCreate}
            onCancel={() => setShowModal(null)}
            saving={saving}
            error={formError}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {showModal === 'edit' && editing && (
        <Modal title={`Modifier — ${editing.nom}`} onClose={() => { setShowModal(null); setEditing(null) }}>
          <ProprietaireForm
            initial={{ nom: editing.nom, email: editing.email, adresse: editing.adresse, logement_ids: editing.logement_ids ?? [] }}
            logements={logements}
            onSave={handleEdit}
            onCancel={() => { setShowModal(null); setEditing(null) }}
            saving={saving}
            error={formError}
          />
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <Modal title="Supprimer le propriétaire" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-dark mb-5">
            Voulez-vous vraiment supprimer <strong>{confirmDelete.nom}</strong> ?
            Cette action est irréversible.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDelete(confirmDelete)}
              disabled={deletingId === confirmDelete.id}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {deletingId === confirmDelete.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {deletingId === confirmDelete.id ? 'Suppression…' : 'Supprimer'}
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2.5 text-sm text-muted border border-border rounded-lg hover:bg-bg transition-colors"
            >
              Annuler
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
