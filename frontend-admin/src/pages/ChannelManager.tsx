import React, { useEffect, useState, useCallback } from 'react'
import {
  Rss, Plus, X, RefreshCw, CheckCircle, AlertTriangle,
  Pencil, Trash2, Clock, ToggleLeft, ToggleRight, ExternalLink,
} from 'lucide-react'
import api from '../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Logement {
  id: string
  nom: string
}

interface Channel {
  id: string
  logement_id: string
  name: string
  type: 'airbnb' | 'booking' | 'vrbo' | 'autre'
  ical_url: string
  is_active: boolean
  last_synced_at: string | null
  created_at: string
  logement_nom: string | null
}

interface SyncResult {
  synced: number
  created: number
  conflicts: Array<{
    reservation_a: { id: string; checkin: string; checkout: string; plateforme: string }
    reservation_b: { id: string; checkin: string; checkout: string; plateforme: string }
  }>
  errors: Array<{ channel: string; errors: number }>
}

interface ChannelForm {
  logement_id: string
  name: string
  type: 'airbnb' | 'booking' | 'vrbo' | 'autre'
  ical_url: string
  is_active: boolean
}

// ── Config visuelle ───────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  airbnb:  { label: 'Airbnb',      cls: 'bg-red-100 text-red-700',      dot: 'bg-red-500'    },
  booking: { label: 'Booking.com', cls: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'   },
  vrbo:    { label: 'VRBO',        cls: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  autre:   { label: 'Autre',       cls: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400'   },
}

const ICAL_HELP: Record<string, string> = {
  airbnb:  'Airbnb → Calendrier → Exporter → Copier le lien iCal',
  booking: 'Booking.com → Extranet → Calendrier → Synchronisation → Lien iCal',
  vrbo:    'VRBO → Calendrier → Importer/Exporter → Copier le lien iCal',
  autre:   'Coller l\'URL iCal fournie par la plateforme',
}

const EMPTY_FORM: ChannelForm = {
  logement_id: '',
  name:        '',
  type:        'airbnb',
  ical_url:    '',
  is_active:   true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Jamais synchronisé'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'À l\'instant'
  if (mins < 60)  return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  return `Il y a ${Math.floor(hours / 24)}j`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// ── Modal création / édition ──────────────────────────────────────────────────

function ChannelModal({
  open,
  onClose,
  logements,
  editing,
  defaultLogementId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  logements: Logement[]
  editing: Channel | null
  defaultLogementId: string
  onSaved: (ch: Channel) => void
}) {
  const [form, setForm]   = useState<ChannelForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        logement_id: editing.logement_id,
        name:        editing.name,
        type:        editing.type,
        ical_url:    editing.ical_url,
        is_active:   editing.is_active,
      })
    } else {
      setForm({ ...EMPTY_FORM, logement_id: defaultLogementId })
    }
    setError(null)
  }, [open, editing, defaultLogementId])

  const set = (key: keyof ChannelForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.logement_id) { setError('Veuillez sélectionner un logement.'); return }
    if (!form.name.trim())  { setError('Le nom du channel est obligatoire.'); return }
    if (!form.ical_url.trim()) { setError('L\'URL iCal est obligatoire.'); return }

    setSaving(true)
    setError(null)
    try {
      let result: Channel
      if (editing) {
        const res = await api.put<Channel>(`/api/channels/${editing.id}`, {
          name:      form.name.trim(),
          type:      form.type,
          ical_url:  form.ical_url.trim(),
          is_active: form.is_active,
        })
        result = res.data
      } else {
        const res = await api.post<Channel>('/api/channels', {
          logement_id: form.logement_id,
          name:        form.name.trim(),
          type:        form.type,
          ical_url:    form.ical_url.trim(),
          is_active:   form.is_active,
        })
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
            {editing ? 'Modifier le channel' : 'Ajouter un channel iCal'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg text-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Logement */}
          {!editing && (
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
          )}

          {/* Nom */}
          <div>
            <label className="block text-xs font-medium text-dark mb-1.5">Nom du channel *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ex : Airbnb - Studio Montmartre"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-dark mb-1.5">Plateforme *</label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value as ChannelForm['type'])}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
              <option value="airbnb">Airbnb</option>
              <option value="booking">Booking.com</option>
              <option value="vrbo">VRBO</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          {/* URL iCal */}
          <div>
            <label className="block text-xs font-medium text-dark mb-1.5">URL iCal *</label>
            <input
              type="url"
              value={form.ical_url}
              onChange={(e) => set('ical_url', e.target.value)}
              placeholder="https://www.airbnb.com/calendar/ical/..."
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            <p className="mt-1.5 text-xs text-muted">
              {ICAL_HELP[form.type]}
            </p>
          </div>

          {/* Actif */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-dark">Channel actif</p>
              <p className="text-xs text-muted">Inclus dans la sync automatique horaire</p>
            </div>
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
              className={`transition-colors ${form.is_active ? 'text-primary' : 'text-muted'}`}>
              {form.is_active
                ? <ToggleRight size={28} />
                : <ToggleLeft size={28} />}
            </button>
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
              {saving ? 'Enregistrement…' : editing ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Carte channel ─────────────────────────────────────────────────────────────

function ChannelCard({
  channel,
  onEdit,
  onDelete,
  onToggle,
  onSync,
}: {
  channel: Channel
  onEdit: (ch: Channel) => void
  onDelete: (id: string) => void
  onToggle: (id: string, active: boolean) => void
  onSync: (ch: Channel) => void
}) {
  const [syncing, setSyncing] = useState(false)
  const tc = TYPE_CONFIG[channel.type]

  const handleSync = async () => {
    setSyncing(true)
    try {
      await onSync(channel)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className={`bg-surface rounded-xl shadow-card p-4 border-l-4 ${
      !channel.is_active ? 'border-gray-200 opacity-60' :
      channel.type === 'airbnb'  ? 'border-red-400'    :
      channel.type === 'booking' ? 'border-blue-400'   :
      channel.type === 'vrbo'    ? 'border-purple-400' : 'border-gray-300'
    }`}>
      <div className="flex items-start justify-between gap-3">
        {/* Infos gauche */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-dark truncate text-sm">{channel.name}</p>
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${tc.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${tc.dot}`} />
              {tc.label}
            </span>
            {!channel.is_active && (
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                Inactif
              </span>
            )}
          </div>

          {/* URL iCal tronquée */}
          <a
            href={channel.ical_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors mb-2 group"
            title={channel.ical_url}>
            <span className="truncate max-w-xs">{channel.ical_url.slice(0, 55)}{channel.ical_url.length > 55 ? '…' : ''}</span>
            <ExternalLink size={10} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>

          {/* Dernière sync */}
          <div className="flex items-center gap-1 text-xs text-muted">
            <Clock size={11} />
            <span>{timeAgo(channel.last_synced_at)}</span>
            {channel.last_synced_at && (
              <CheckCircle size={11} className="text-green-500 ml-1" />
            )}
          </div>
        </div>

        {/* Actions droite */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Bouton sync */}
          <button
            disabled={syncing || !channel.is_active}
            onClick={handleSync}
            title="Synchroniser maintenant"
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ minHeight: '32px' }}>
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sync…' : 'Sync'}
          </button>

          {/* Toggle actif / inactif */}
          <button
            onClick={() => onToggle(channel.id, !channel.is_active)}
            title={channel.is_active ? 'Désactiver' : 'Activer'}
            className={`transition-colors ${channel.is_active ? 'text-primary hover:text-primary/70' : 'text-muted hover:text-dark'}`}>
            {channel.is_active
              ? <ToggleRight size={22} />
              : <ToggleLeft size={22} />}
          </button>

          {/* Éditer / Supprimer */}
          <div className="flex gap-1.5">
            <button
              onClick={() => onEdit(channel)}
              className="p-1.5 rounded-lg text-muted hover:text-dark hover:bg-bg border border-border transition-colors"
              title="Modifier">
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onDelete(channel.id)}
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

// ── Bandeau résultat de sync ──────────────────────────────────────────────────

function SyncBanner({ result, onClose }: { result: SyncResult; onClose: () => void }) {
  const hasConflicts = result.conflicts.length > 0
  const hasErrors    = result.errors.length > 0

  return (
    <div className={`rounded-xl border px-4 py-3 mb-4 flex items-start gap-3 ${
      hasConflicts || hasErrors
        ? 'bg-orange-50 border-orange-200'
        : 'bg-green-50 border-green-200'
    }`}>
      {hasConflicts || hasErrors
        ? <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
        : <CheckCircle   size={18} className="text-green-500 flex-shrink-0 mt-0.5" />}

      <div className="flex-1 text-sm">
        <p className={`font-medium ${hasConflicts || hasErrors ? 'text-orange-700' : 'text-green-700'}`}>
          {hasConflicts || hasErrors ? 'Sync terminée avec alertes' : 'Sync réussie'}
        </p>
        <p className="text-xs mt-0.5 text-muted">
          {result.synced} événement(s) traité(s) · {result.created} nouvelle(s) réservation(s) importée(s)
        </p>

        {hasConflicts && (
          <div className="mt-2">
            <p className="text-xs font-medium text-orange-700">{result.conflicts.length} conflit(s) de dates détecté(s) :</p>
            <ul className="mt-1 space-y-0.5">
              {result.conflicts.slice(0, 3).map((c, i) => (
                <li key={i} className="text-xs text-orange-600">
                  {c.reservation_a.plateforme} {formatDate(c.reservation_a.checkin)}–{formatDate(c.reservation_a.checkout)}
                  {' '}↔{' '}
                  {c.reservation_b.plateforme} {formatDate(c.reservation_b.checkin)}–{formatDate(c.reservation_b.checkout)}
                </li>
              ))}
              {result.conflicts.length > 3 && (
                <li className="text-xs text-orange-500">+{result.conflicts.length - 3} autres…</li>
              )}
            </ul>
          </div>
        )}

        {hasErrors && (
          <p className="text-xs text-orange-600 mt-1">
            Erreurs : {result.errors.map((e) => `${e.channel} (${e.errors})`).join(', ')}
          </p>
        )}
      </div>

      <button onClick={onClose} className="text-muted hover:text-dark flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function ChannelManager() {
  const [logements, setLogements]     = useState<Logement[]>([])
  const [selectedLogement, setSelectedLogement] = useState<string>('')
  const [channels, setChannels]       = useState<Channel[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Modal
  const [modalOpen, setModalOpen]     = useState(false)
  const [editing, setEditing]         = useState<Channel | null>(null)

  // Sync globale
  const [syncing, setSyncing]         = useState(false)
  const [syncResult, setSyncResult]   = useState<SyncResult | null>(null)

  // Charger les logements au montage
  useEffect(() => {
    api.get<Logement[]>('/api/logements')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : []
        setLogements(list)
        if (list.length > 0) setSelectedLogement(list[0].id)
      })
      .catch(() => {})
  }, [])

  // Charger les channels quand le logement sélectionné change
  const loadChannels = useCallback(async () => {
    if (!selectedLogement) { setChannels([]); return }
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<Channel[]>('/api/channels', {
        params: { logement_id: selectedLogement },
      })
      setChannels(Array.isArray(res.data) ? res.data : [])
    } catch {
      setError('Impossible de charger les channels.')
    } finally {
      setLoading(false)
    }
  }, [selectedLogement])

  useEffect(() => { loadChannels() }, [loadChannels])

  // Sync manuelle d'un channel
  const handleSyncChannel = async (channel: Channel) => {
    setSyncResult(null)
    try {
      const res = await api.post<SyncResult>(`/api/channels/sync/${channel.logement_id}`)
      setSyncResult(res.data)
      // Rafraîchir last_synced_at
      await loadChannels()
    } catch {
      setError('Erreur lors de la synchronisation.')
    }
  }

  // Sync globale (tous les channels du logement)
  const handleSyncAll = async () => {
    if (!selectedLogement) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await api.post<SyncResult>(`/api/channels/sync/${selectedLogement}`)
      setSyncResult(res.data)
      await loadChannels()
    } catch {
      setError('Erreur lors de la synchronisation globale.')
    } finally {
      setSyncing(false)
    }
  }

  // Toggle actif/inactif
  const handleToggle = async (id: string, active: boolean) => {
    try {
      const res = await api.put<Channel>(`/api/channels/${id}`, { is_active: active })
      setChannels((prev) => prev.map((c) => c.id === id ? res.data : c))
    } catch {
      setError('Erreur lors de la mise à jour.')
    }
  }

  // Suppression
  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce channel ? Les réservations déjà importées ne seront pas supprimées.')) return
    try {
      await api.delete(`/api/channels/${id}`)
      setChannels((prev) => prev.filter((c) => c.id !== id))
    } catch {
      setError('Erreur lors de la suppression.')
    }
  }

  // Sauvegarde (création ou édition)
  const handleSaved = (saved: Channel) => {
    setChannels((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
  }

  const openNew  = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (ch: Channel) => { setEditing(ch); setModalOpen(true) }

  // Stats rapides
  const activeCount   = channels.filter((c) => c.is_active).length
  const syncedCount   = channels.filter((c) => c.last_synced_at).length

  return (
    <div>
      {/* En-tête : sélecteur logement + bouton sync globale */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select
          value={selectedLogement}
          onChange={(e) => { setSelectedLogement(e.target.value); setSyncResult(null) }}
          className="bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-card flex-1 sm:max-w-xs">
          {logements.length === 0
            ? <option value="">Aucun logement</option>
            : logements.map((l) => (
              <option key={l.id} value={l.id}>{l.nom}</option>
            ))}
        </select>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleSyncAll}
            disabled={syncing || !selectedLogement || channels.filter((c) => c.is_active).length === 0}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50">
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sync en cours…' : 'Sync tous'}
          </button>

          <button
            onClick={openNew}
            disabled={!selectedLogement}
            className="flex items-center gap-2 bg-surface border border-border text-dark px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-bg transition-colors shadow-card disabled:opacity-50">
            <Plus size={15} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
        <div className="bg-surface shadow-card rounded-xl p-3 sm:p-4 flex items-center justify-between">
          <p className="text-sm text-muted">Channels</p>
          <p className="text-2xl font-bold text-dark">{channels.length}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 sm:p-4 flex items-center justify-between">
          <p className="text-sm text-green-600">Actifs</p>
          <p className="text-2xl font-bold text-green-700">{activeCount}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-4 flex items-center justify-between">
          <p className="text-sm text-blue-600">Synchronisés</p>
          <p className="text-2xl font-bold text-blue-700">{syncedCount}</p>
        </div>
      </div>

      {/* Résultat sync */}
      {syncResult && (
        <SyncBanner result={syncResult} onClose={() => setSyncResult(null)} />
      )}

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : channels.length === 0 ? (
        <div className="bg-surface rounded-xl shadow-card flex flex-col items-center justify-center h-48 gap-3">
          <Rss size={36} className="text-gray-300" />
          <p className="text-sm text-muted">
            {selectedLogement
              ? 'Aucun channel configuré pour ce logement'
              : 'Sélectionnez un logement'}
          </p>
          {selectedLogement && (
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
              <Plus size={13} />
              Ajouter un channel iCal
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map((ch) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onSync={handleSyncChannel}
            />
          ))}
        </div>
      )}

      {/* Info sync auto */}
      {channels.length > 0 && (
        <p className="mt-4 text-xs text-muted text-center">
          Synchronisation automatique toutes les heures · Dernière sync indiquée sur chaque channel
        </p>
      )}

      {/* Modal */}
      <ChannelModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        logements={logements}
        editing={editing}
        defaultLogementId={selectedLogement}
        onSaved={handleSaved}
      />
    </div>
  )
}
