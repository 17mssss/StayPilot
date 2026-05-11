import React, { useEffect, useState, useCallback } from 'react'
import { Wrench, Plus, X, AlertTriangle, Clock, CheckCircle, Pencil, Trash2 } from 'lucide-react'
import api from '../lib/api'
import FeatureGate from '../components/FeatureGate'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Logement {
  id: string
  nom: string
}

interface Maintenance {
  id: string
  logement_id: string
  titre: string
  description?: string | null
  priorite: 'faible' | 'normale' | 'urgente'
  statut: 'a_faire' | 'en_cours' | 'termine'
  prestataire?: string | null
  cout_estime?: number | null
  date_signalement?: string | null
  date_resolution?: string | null
  created_at: string
  logements?: { nom: string } | null
}

interface MaintenanceForm {
  logement_id: string
  titre: string
  description: string
  priorite: 'faible' | 'normale' | 'urgente'
  statut: 'a_faire' | 'en_cours' | 'termine'
  prestataire: string
  cout_estime: string
  date_signalement: string
  date_resolution: string
}

// ── Config badges ─────────────────────────────────────────────────────────────

const PRIORITE_CONFIG = {
  urgente: { label: 'Urgente',  cls: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
  normale: { label: 'Normale',  cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  faible:  { label: 'Faible',   cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
}

const STATUT_CONFIG = {
  a_faire:  { label: 'À faire',   cls: 'bg-gray-100 text-gray-600',  icon: <Clock size={12} /> },
  en_cours: { label: 'En cours',  cls: 'bg-blue-100 text-blue-700',  icon: <AlertTriangle size={12} /> },
  termine:  { label: 'Terminé',   cls: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
}

const EMPTY_FORM: MaintenanceForm = {
  logement_id:      '',
  titre:            '',
  description:      '',
  priorite:         'normale',
  statut:           'a_faire',
  prestataire:      '',
  cout_estime:      '',
  date_signalement: new Date().toISOString().split('T')[0],
  date_resolution:  '',
}

// ── Composant carte ───────────────────────────────────────────────────────────

function MaintenanceCard({
  item,
  onEdit,
  onDelete,
  onStatutChange,
}: {
  item: Maintenance
  onEdit: (m: Maintenance) => void
  onDelete: (id: string) => void
  onStatutChange: (id: string, statut: Maintenance['statut']) => void
}) {
  const [saving, setSaving] = useState(false)
  const pc = PRIORITE_CONFIG[item.priorite]
  const sc = STATUT_CONFIG[item.statut]

  const nextStatut: Record<Maintenance['statut'], Maintenance['statut'] | null> = {
    a_faire:  'en_cours',
    en_cours: 'termine',
    termine:  null,
  }
  const next = nextStatut[item.statut]

  const handleNext = async () => {
    if (!next) return
    setSaving(true)
    try {
      await api.patch(`/api/maintenances/${item.id}`, { statut: next })
      onStatutChange(item.id, next)
    } catch { /* swallow */ }
    finally { setSaving(false) }
  }

  return (
    <div className={`bg-surface rounded-xl shadow-card p-5 border-l-4 ${
      item.priorite === 'urgente' ? 'border-red-400' :
      item.priorite === 'normale' ? 'border-orange-300' : 'border-green-400'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Titre + logement */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-dark truncate">{item.titre}</p>
            {item.priorite === 'urgente' && (
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">⚡ Urgent</span>
            )}
          </div>
          <p className="text-xs text-muted mb-2">{item.logements?.nom ?? 'Logement inconnu'}</p>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-muted bg-bg rounded-lg px-2.5 py-1.5 mb-2">{item.description}</p>
          )}

          {/* Méta */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {item.date_signalement && (
              <span>Signalé : {new Date(item.date_signalement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            )}
            {item.prestataire && <span>Prestataire : <span className="font-medium text-dark">{item.prestataire}</span></span>}
            {item.cout_estime != null && (
              <span>Coût estimé : <span className="font-medium text-dark">{item.cout_estime.toLocaleString('fr-FR')} €</span></span>
            )}
            {item.date_resolution && (
              <span className="text-green-600">Résolu : {new Date(item.date_resolution).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            )}
          </div>
        </div>

        {/* Actions droite */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Badges */}
          <div className="flex gap-1.5">
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${pc.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
              {pc.label}
            </span>
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${sc.cls}`}>
              {sc.icon}
              {sc.label}
            </span>
          </div>

          {/* Bouton avancer le statut */}
          {next && (
            <button
              disabled={saving}
              onClick={handleNext}
              className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              style={{ minHeight: '32px' }}>
              {next === 'en_cours' ? 'Démarrer' : '✓ Marquer terminé'}
            </button>
          )}

          {/* Éditer / Supprimer */}
          <div className="flex gap-1.5">
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 rounded-lg text-muted hover:text-dark hover:bg-bg border border-border transition-colors"
              title="Modifier">
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 border border-border transition-colors"
              title="Supprimer">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal création / édition ───────────────────────────────────────────────────

function MaintenanceModal({
  open,
  onClose,
  logements,
  editing,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  logements: Logement[]
  editing: Maintenance | null
  onSaved: (m: Maintenance) => void
}) {
  const [form, setForm] = useState<MaintenanceForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        logement_id:      editing.logement_id,
        titre:            editing.titre,
        description:      editing.description ?? '',
        priorite:         editing.priorite,
        statut:           editing.statut,
        prestataire:      editing.prestataire ?? '',
        cout_estime:      editing.cout_estime != null ? String(editing.cout_estime) : '',
        date_signalement: editing.date_signalement ?? '',
        date_resolution:  editing.date_resolution ?? '',
      })
    } else {
      setForm({ ...EMPTY_FORM, date_signalement: new Date().toISOString().split('T')[0] })
    }
    setError(null)
  }, [open, editing])

  const set = (key: keyof MaintenanceForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.logement_id) { setError('Veuillez sélectionner un logement.'); return }
    if (!form.titre.trim()) { setError('Le titre est obligatoire.'); return }

    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        logement_id:      form.logement_id,
        titre:            form.titre.trim(),
        description:      form.description.trim() || null,
        priorite:         form.priorite,
        statut:           form.statut,
        prestataire:      form.prestataire.trim() || null,
        cout_estime:      form.cout_estime !== '' ? parseFloat(form.cout_estime) : null,
        date_signalement: form.date_signalement || null,
        date_resolution:  form.date_resolution || null,
      }

      let result: Maintenance
      if (editing) {
        const res = await api.patch<Maintenance>(`/api/maintenances/${editing.id}`, payload)
        result = res.data
      } else {
        const res = await api.post<Maintenance>('/api/maintenances', payload)
        result = res.data
      }
      onSaved(result)
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(typeof msg === 'string' ? msg : 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-dark">
            {editing ? 'Modifier l\'intervention' : 'Nouvelle intervention'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg text-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Logement */}
          <div>
            <label className="block text-xs font-medium text-dark mb-1.5">Logement *</label>
            <select
              value={form.logement_id}
              onChange={(e) => set('logement_id', e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
              <option value="">Sélectionner un logement…</option>
              {logements.map((l) => (
                <option key={l.id} value={l.id}>{l.nom}</option>
              ))}
            </select>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-xs font-medium text-dark mb-1.5">Titre *</label>
            <input
              type="text"
              value={form.titre}
              onChange={(e) => set('titre', e.target.value)}
              placeholder="Ex : Robinet qui fuit salle de bain"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-dark mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Détails de l'intervention…"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
          </div>

          {/* Priorité + Statut */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-dark mb-1.5">Priorité</label>
              <select
                value={form.priorite}
                onChange={(e) => set('priorite', e.target.value as MaintenanceForm['priorite'])}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                <option value="faible">Faible</option>
                <option value="normale">Normale</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark mb-1.5">Statut</label>
              <select
                value={form.statut}
                onChange={(e) => set('statut', e.target.value as MaintenanceForm['statut'])}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                <option value="a_faire">À faire</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
              </select>
            </div>
          </div>

          {/* Prestataire + Coût */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-dark mb-1.5">Prestataire</label>
              <input
                type="text"
                value={form.prestataire}
                onChange={(e) => set('prestataire', e.target.value)}
                placeholder="Nom ou société"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark mb-1.5">Coût estimé (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cout_estime}
                onChange={(e) => set('cout_estime', e.target.value)}
                placeholder="0"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-dark mb-1.5">Date signalement</label>
              <input
                type="date"
                value={form.date_signalement}
                onChange={(e) => set('date_signalement', e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark mb-1.5">Date résolution</label>
              <input
                type="date"
                value={form.date_resolution}
                onChange={(e) => set('date_resolution', e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-muted hover:text-dark transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? 'Enregistrement…' : editing ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function Maintenances() {
  const [items, setItems]           = useState<Maintenance[]>([])
  const [logements, setLogements]   = useState<Logement[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  // Filtres
  const [filterStatut, setFilterStatut]     = useState<string>('')
  const [filterPriorite, setFilterPriorite] = useState<string>('')
  const [filterLogement, setFilterLogement] = useState<string>('')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Maintenance | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (filterStatut)   params.statut     = filterStatut
      if (filterPriorite) params.priorite   = filterPriorite
      if (filterLogement) params.logement_id = filterLogement

      const res = await api.get<Maintenance[]>('/api/maintenances', { params })
      setItems(Array.isArray(res.data) ? res.data : [])
    } catch {
      setError('Impossible de charger les interventions.')
    } finally {
      setLoading(false)
    }
  }, [filterStatut, filterPriorite, filterLogement])

  // Charger les logements une fois
  useEffect(() => {
    api.get<Logement[]>('/api/logements')
      .then((r) => setLogements(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  // Stats rapides
  const total    = items.length
  const urgentes = items.filter((m) => m.priorite === 'urgente' && m.statut !== 'termine').length
  const enCours  = items.filter((m) => m.statut === 'en_cours').length

  const handleSaved = (saved: Maintenance) => {
    setItems((prev) => {
      const idx = prev.findIndex((m) => m.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette intervention ?')) return
    try {
      await api.delete(`/api/maintenances/${id}`)
      setItems((prev) => prev.filter((m) => m.id !== id))
    } catch {
      alert('Erreur lors de la suppression.')
    }
  }

  const handleStatutChange = (id: string, statut: Maintenance['statut']) => {
    setItems((prev) => prev.map((m) => m.id === id ? { ...m, statut } : m))
  }

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (m: Maintenance) => { setEditing(m); setModalOpen(true) }

  return (
    <FeatureGate feature="maintenance">
    <div>
      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
        <div className="bg-surface shadow-card rounded-xl p-3 sm:p-4 flex items-center justify-between">
          <p className="text-sm text-muted">Total</p>
          <p className="text-2xl font-bold text-dark">{total}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4 flex items-center justify-between">
          <p className="text-sm text-red-600">Urgentes</p>
          <p className="text-2xl font-bold text-red-700">{urgentes}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-4 flex items-center justify-between">
          <p className="text-sm text-blue-600">En cours</p>
          <p className="text-2xl font-bold text-blue-700">{enCours}</p>
        </div>
      </div>

      {/* Barre d'actions + filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Filtres */}
        <div className="flex gap-2 flex-1 flex-wrap">
          {/* Statut */}
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-card">
            <option value="">Tous les statuts</option>
            <option value="a_faire">À faire</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
          </select>

          {/* Priorité */}
          <select
            value={filterPriorite}
            onChange={(e) => setFilterPriorite(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-card">
            <option value="">Toutes priorités</option>
            <option value="urgente">Urgente</option>
            <option value="normale">Normale</option>
            <option value="faible">Faible</option>
          </select>

          {/* Logement */}
          <select
            value={filterLogement}
            onChange={(e) => setFilterLogement(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-card">
            <option value="">Tous les logements</option>
            {logements.map((l) => (
              <option key={l.id} value={l.id}>{l.nom}</option>
            ))}
          </select>
        </div>

        {/* Bouton nouvelle intervention */}
        <button
          onClick={openNew}
          className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm flex-shrink-0">
          <Plus size={16} />
          Nouvelle intervention
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center h-48 gap-2">
          <AlertTriangle size={32} className="text-red-300" />
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={load}
            className="text-xs text-primary hover:underline">
            Réessayer
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface rounded-xl shadow-card flex flex-col items-center justify-center h-48 gap-3">
          <Wrench size={36} className="text-gray-300" />
          <p className="text-sm text-muted">Aucune intervention pour ces filtres</p>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
            <Plus size={13} />
            Créer une intervention
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <MaintenanceCard
              key={item.id}
              item={item}
              onEdit={openEdit}
              onDelete={handleDelete}
              onStatutChange={handleStatutChange}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <MaintenanceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        logements={logements}
        editing={editing}
        onSaved={handleSaved}
      />
    </div>
    </FeatureGate>
  )
}
