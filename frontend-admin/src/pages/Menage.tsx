import React, { useEffect, useState, useCallback } from 'react'
import { Sparkles, CheckCircle, Clock, RefreshCw, FileText } from 'lucide-react'
import api from '../lib/api'

interface Task {
  reservation_id: string
  guest_name: string
  property: string
  checkout: string
  checkin_next?: string | null
  status: 'pending' | 'in_progress' | 'done'
  notes?: string | null
}

interface Stats { total: number; pending: number; in_progress: number; done: number }

const STATUS_CONFIG = {
  pending:     { label: 'À faire',    cls: 'bg-yellow-100 text-yellow-700', icon: <Clock size={12} /> },
  in_progress: { label: 'En cours',   cls: 'bg-blue-100 text-blue-700',    icon: <RefreshCw size={12} /> },
  done:        { label: 'Terminé',    cls: 'bg-green-100 text-green-700',   icon: <CheckCircle size={12} /> },
}

function TaskCard({ task, onStatusChange }: {
  task: Task
  onStatusChange: (id: string, status: Task['status']) => void
}) {
  const [saving, setSaving] = useState(false)
  const config = STATUS_CONFIG[task.status]
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const isToday  = task.checkout === today
  const isUrgent = task.checkin_next === today || task.checkin_next === tomorrow

  const changeStatus = async (newStatus: Task['status']) => {
    setSaving(true)
    try {
      await api.patch(`/api/menage/${task.reservation_id}/status`, { status: newStatus })
      onStatusChange(task.reservation_id, newStatus)
    } catch { /* swallow */ }
    finally { setSaving(false) }
  }

  return (
    <div className={`bg-surface rounded-xl shadow-card p-5 border-l-4 ${
      task.status === 'done' ? 'border-green-400' : isUrgent ? 'border-red-400' : isToday ? 'border-yellow-400' : 'border-border'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-dark truncate">{task.property}</p>
            {isUrgent && (
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">⚡ Urgent</span>
            )}
            {isToday && !isUrgent && (
              <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">Aujourd'hui</span>
            )}
          </div>
          <p className="text-sm text-muted">Départ : {task.guest_name}</p>
          <div className="flex gap-4 mt-2 text-xs text-muted flex-wrap">
            <span>Checkout : {new Date(task.checkout).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
            {task.checkin_next && (
              <span className="text-primary font-medium">
                Prochain check-in : {new Date(task.checkin_next).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </div>
          {task.notes && (
            <p className="mt-2 text-xs text-muted bg-bg rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
              <FileText size={11} className="flex-shrink-0 mt-0.5" />
              {task.notes}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${config.cls}`}>
            {config.icon}
            {config.label}
          </span>
          {task.status !== 'done' && (
            <div className="flex gap-2">
              {task.status === 'pending' && (
                <button
                  disabled={saving}
                  onClick={() => changeStatus('in_progress')}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50" style={{ minHeight: '36px' }}>
                  Démarrer
                </button>
              )}
              {task.status === 'in_progress' && (
                <button
                  disabled={saving}
                  onClick={() => changeStatus('done')}
                  className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50" style={{ minHeight: '36px' }}>
                  ✓ Terminé
                </button>
              )}
            </div>
          )}
          {task.status === 'done' && (
            <button
              disabled={saving}
              onClick={() => changeStatus('pending')}
              className="text-xs text-muted hover:text-dark border border-border rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50" style={{ minHeight: '36px' }}>
              Réouvrir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Menage() {
  const [tasks, setTasks]     = useState<Task[]>([])
  const [stats, setStats]     = useState<Stats>({ total: 0, pending: 0, in_progress: 0, done: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'today' | 'week' | 'all'>('week')

  const load = useCallback((f: string) => {
    setLoading(true)
    Promise.all([
      api.get<Task[]>('/api/menage', { params: { filter: f } })
        .then((r) => setTasks(Array.isArray(r.data) ? r.data : []))
        .catch(() => setTasks([])),
      api.get<Stats>('/api/menage/stats')
        .then((r) => setStats(r.data ?? { total: 0, pending: 0, in_progress: 0, done: 0 }))
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(filter) }, [filter, load])

  const handleStatusChange = (id: string, status: Task['status']) => {
    setTasks((prev) => prev.map((t) => t.reservation_id === id ? { ...t, status } : t))
    // Refresh stats
    api.get<Stats>('/api/menage/stats')
      .then((r) => setStats(r.data ?? stats))
      .catch(() => {})
  }

  const done  = tasks.filter((t) => t.status === 'done').length
  const total = tasks.length

  return (
    <div>
      {/* Stats globales (semaine) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
        {[
          { label: 'Cette semaine', value: stats.total,       cls: 'bg-surface shadow-card' },
          { label: 'À faire',       value: stats.pending,     cls: 'bg-yellow-50 border border-yellow-100' },
          { label: 'En cours',      value: stats.in_progress, cls: 'bg-blue-50 border border-blue-100' },
          { label: 'Terminées',     value: stats.done,        cls: 'bg-green-50 border border-green-100' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`rounded-xl p-3 sm:p-4 flex items-center justify-between ${cls}`}>
            <p className="text-sm text-muted">{label}</p>
            <p className="text-2xl font-bold text-dark">{value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar (filtrée) */}
      {total > 0 && (
        <div className="bg-surface rounded-xl shadow-card p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-dark">Avancement ({filter === 'today' ? "aujourd'hui" : filter === 'week' ? 'cette semaine' : 'tout'})</p>
            <p className="text-sm font-bold text-primary">{done}/{total}</p>
          </div>
          <div className="h-2 bg-bg rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'today', label: "Aujourd'hui" },
          { key: 'week',  label: 'Semaine' },
          { key: 'all',   label: 'Tout' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              filter === key ? 'bg-primary text-white' : 'bg-surface shadow-card text-muted hover:text-dark'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-surface rounded-xl shadow-card flex flex-col items-center justify-center h-48 gap-3">
          <Sparkles size={36} className="text-gray-300" />
          <p className="text-sm text-muted">Aucune mission pour cette période</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.reservation_id} task={task} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  )
}
