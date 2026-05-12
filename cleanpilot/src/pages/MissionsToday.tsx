import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, Clock, CheckCircle2, AlertTriangle, ChevronRight,
  RefreshCw, Calendar, Loader2, MapPin,
} from 'lucide-react'
import api from '../lib/api'

export interface Mission {
  id: string
  logement_id?: string
  logement_name?: string
  address?: string
  type: 'menage' | 'maintenance' | 'check_in' | 'check_out'
  status: 'pending' | 'in_progress' | 'done' | 'cancelled'
  priority: 'urgent' | 'normal' | 'low'
  scheduled_at?: string   // ISO date string
  deadline?: string       // ISO date string
  duration_min?: number   // estimated duration in minutes
  notes?: string
  checklist?: ChecklistItem[]
  assigned_to?: string
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

const TYPE_LABELS: Record<string, string> = {
  menage: 'Ménage',
  maintenance: 'Maintenance',
  check_in: 'Arrivée',
  check_out: 'Départ',
}

const TYPE_COLORS: Record<string, string> = {
  menage: 'bg-sky-100 text-sky-700',
  maintenance: 'bg-orange-100 text-orange-700',
  check_in: 'bg-green-100 text-green-700',
  check_out: 'bg-purple-100 text-purple-700',
}

function UrgencyBadge({ priority }: { priority: Mission['priority'] }) {
  if (priority === 'urgent') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
        <AlertTriangle size={11} /> URGENT
      </span>
    )
  }
  if (priority === 'low') {
    return <span className="text-[11px] text-muted bg-gray-100 px-2 py-0.5 rounded-full">Faible priorité</span>
  }
  return null
}

function StatusIcon({ status }: { status: Mission['status'] }) {
  if (status === 'done') return <CheckCircle2 size={20} className="text-success" />
  if (status === 'in_progress') return <Loader2 size={20} className="text-brand animate-spin" />
  return <div className="w-5 h-5 rounded-full border-2 border-border" />
}

function formatTime(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// Mock data for demo (used when API returns empty)
function getMockMissions(): Mission[] {
  const today = new Date().toISOString().split('T')[0]
  return [
    {
      id: 'mock-1',
      logement_name: 'Appartement Bastille',
      address: '12 rue de la Roquette, Paris 11e',
      type: 'menage',
      status: 'pending',
      priority: 'urgent',
      scheduled_at: `${today}T09:00:00`,
      deadline: `${today}T11:00:00`,
      duration_min: 90,
      notes: 'Locataire repart à 10h. Prochain arrive à 14h. Changer les draps chambre 2.',
      checklist: [
        { id: 'c1', label: 'Faire les lits (chambre 1 + 2)', done: false },
        { id: 'c2', label: 'Nettoyer la salle de bain', done: false },
        { id: 'c3', label: 'Cuisine + vaisselle', done: false },
        { id: 'c4', label: 'Aspirer + serpillière', done: false },
        { id: 'c5', label: 'Vérifier stock serviettes', done: false },
        { id: 'c6', label: 'Recharger kit accueil', done: false },
      ],
    },
    {
      id: 'mock-2',
      logement_name: 'Studio Marais',
      address: '8 rue des Rosiers, Paris 4e',
      type: 'check_out',
      status: 'pending',
      priority: 'normal',
      scheduled_at: `${today}T10:30:00`,
      duration_min: 30,
      notes: 'Récupérer les clés boîte aux lettres n°4.',
      checklist: [
        { id: 'c7', label: 'Récupérer les clés', done: false },
        { id: 'c8', label: 'Vérifier état du logement', done: false },
        { id: 'c9', label: 'Signaler dommages éventuels', done: false },
      ],
    },
    {
      id: 'mock-3',
      logement_name: 'Loft Oberkampf',
      address: '54 rue Oberkampf, Paris 11e',
      type: 'menage',
      status: 'done',
      priority: 'normal',
      scheduled_at: `${today}T08:00:00`,
      duration_min: 120,
      checklist: [
        { id: 'c10', label: 'Faire les lits', done: true },
        { id: 'c11', label: 'Nettoyer salle de bain', done: true },
        { id: 'c12', label: 'Cuisine', done: true },
      ],
    },
    {
      id: 'mock-4',
      logement_name: 'Chambre Montmartre',
      address: '22 rue Lepic, Paris 18e',
      type: 'check_in',
      status: 'pending',
      priority: 'low',
      scheduled_at: `${today}T15:00:00`,
      duration_min: 15,
      notes: 'Déposer les clés dans la boîte à code. Code : 4729.',
      checklist: [
        { id: 'c13', label: 'Déposer les clés', done: false },
        { id: 'c14', label: 'Vérifier que le logement est prêt', done: false },
      ],
    },
  ]
}

export default function MissionsToday() {
  const navigate = useNavigate()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [useMock, setUseMock] = useState(false)

  const today = new Date()
  const dateLabel = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const fetchMissions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get<Mission[]>('/api/menage', {
        params: {
          date: today.toISOString().split('T')[0],
          assigned_to_me: true,
        },
      })
      const data = Array.isArray(res.data) ? res.data : []
      if (data.length === 0) {
        setMissions(getMockMissions())
        setUseMock(true)
      } else {
        setMissions(data)
        setUseMock(false)
      }
    } catch {
      setMissions(getMockMissions())
      setUseMock(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchMissions()
  }, [fetchMissions])

  const pending = missions.filter(m => m.status === 'pending' || m.status === 'in_progress')
  const done = missions.filter(m => m.status === 'done')
  const urgent = pending.filter(m => m.priority === 'urgent')

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted">Chargement des missions…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg safe-top safe-bottom">
      {/* Header */}
      <div className="bg-surface px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted mb-0.5">
              <Calendar size={12} />
              <span className="capitalize">{dateLabel}</span>
            </div>
            <h1 className="text-xl font-bold text-dark">Mes missions</h1>
          </div>
          <button
            onClick={() => fetchMissions(true)}
            disabled={refreshing}
            className="w-9 h-9 rounded-xl bg-bg border border-border flex items-center justify-center text-muted active:scale-95"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted">{done.length}/{missions.length} terminées</span>
            <span className="text-xs font-semibold text-brand">
              {missions.length > 0 ? Math.round((done.length / missions.length) * 100) : 0}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${missions.length > 0 ? (done.length / missions.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Demo notice */}
      {useMock && (
        <div className="mx-4 mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-700">
            ⚡ Mode démo — missions d'exemple affichées (API non connectée)
          </p>
        </div>
      )}

      {/* Urgent banner */}
      {urgent.length > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm font-medium text-red-700">
            {urgent.length} mission{urgent.length > 1 ? 's' : ''} urgente{urgent.length > 1 ? 's' : ''} aujourd'hui
          </p>
        </div>
      )}

      {/* Mission list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        {/* Pending */}
        {pending.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider px-1">À faire</p>
            {pending
              .sort((a, b) => {
                // Urgent first, then by time
                if (a.priority === 'urgent' && b.priority !== 'urgent') return -1
                if (b.priority === 'urgent' && a.priority !== 'urgent') return 1
                return (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? '')
              })
              .map(m => (
                <MissionCard key={m.id} mission={m} onClick={() => navigate(`/missions/${m.id}`)} />
              ))}
          </>
        )}

        {/* Done */}
        {done.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider px-1 mt-2">Terminées</p>
            {done.map(m => (
              <MissionCard key={m.id} mission={m} onClick={() => navigate(`/missions/${m.id}`)} />
            ))}
          </>
        )}

        {missions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CheckCircle2 size={48} className="text-success" />
            <p className="text-base font-semibold text-dark">Aucune mission aujourd'hui</p>
            <p className="text-sm text-muted text-center">Profitez-en ! 🎉</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MissionCard({ mission: m, onClick }: { mission: Mission; onClick: () => void }) {
  const checklistDone = (m.checklist ?? []).filter(c => c.done).length
  const checklistTotal = (m.checklist ?? []).length

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-surface rounded-2xl shadow-card p-4 active:scale-[0.98] transition-transform ${
        m.status === 'done' ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <StatusIcon status={m.status} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-semibold text-dark text-sm leading-tight">{m.logement_name ?? 'Logement'}</p>
            <UrgencyBadge priority={m.priority} />
          </div>
          {m.address && (
            <p className="text-xs text-muted flex items-center gap-1 mb-2 truncate">
              <MapPin size={11} /> {m.address}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[m.type] ?? 'bg-gray-100 text-gray-600'}`}>
              {TYPE_LABELS[m.type] ?? m.type}
            </span>
            {m.scheduled_at && (
              <span className="text-[11px] text-muted flex items-center gap-0.5">
                <Clock size={11} /> {formatTime(m.scheduled_at)}
                {m.deadline && <> → {formatTime(m.deadline)}</>}
              </span>
            )}
            {m.duration_min && (
              <span className="text-[11px] text-muted">~{m.duration_min} min</span>
            )}
          </div>
          {checklistTotal > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-muted">{checklistDone}/{checklistTotal} tâches</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full"
                  style={{ width: `${checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <ChevronRight size={16} className="text-muted flex-shrink-0 mt-1" />
      </div>
    </button>
  )
}
