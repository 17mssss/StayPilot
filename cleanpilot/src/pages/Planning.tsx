import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Home } from 'lucide-react'
import api from '../lib/api'
import type { Mission } from './MissionsToday'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const TYPE_COLORS: Record<string, string> = {
  menage: 'border-l-sky-400 bg-sky-50',
  maintenance: 'border-l-orange-400 bg-orange-50',
  check_in: 'border-l-green-400 bg-green-50',
  check_out: 'border-l-purple-400 bg-purple-50',
}
const TYPE_LABELS: Record<string, string> = {
  menage: 'Ménage', maintenance: 'Maintenance',
  check_in: 'Arrivée', check_out: 'Départ',
}

function getWeekDates(offset: number): Date[] {
  const today = new Date()
  const day = today.getDay()
  const mondayOffset = (day === 0 ? -6 : 1 - day) + offset * 7
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMockWeekMissions(dates: Date[]): Mission[] {
  const missions: Mission[] = []
  dates.forEach((d, i) => {
    const ds = d.toISOString().split('T')[0]
    if (i === 0 || i === 3) missions.push({
      id: `mock-w-${ds}-1`,
      logement_name: 'Appartement Bastille',
      type: 'menage',
      status: i < 2 ? 'done' : 'pending',
      priority: i === 0 ? 'urgent' : 'normal',
      scheduled_at: `${ds}T09:00:00`,
      duration_min: 90,
    })
    if (i === 1 || i === 4) missions.push({
      id: `mock-w-${ds}-2`,
      logement_name: 'Studio Marais',
      type: 'check_out',
      status: i < 2 ? 'done' : 'pending',
      priority: 'normal',
      scheduled_at: `${ds}T10:30:00`,
      duration_min: 30,
    })
    if (i === 2) missions.push({
      id: `mock-w-${ds}-3`,
      logement_name: 'Loft Oberkampf',
      type: 'maintenance',
      status: 'done',
      priority: 'low',
      scheduled_at: `${ds}T14:00:00`,
      duration_min: 60,
    })
    if (i === 5) missions.push({
      id: `mock-w-${ds}-4`,
      logement_name: 'Chambre Montmartre',
      type: 'check_in',
      status: 'pending',
      priority: 'normal',
      scheduled_at: `${ds}T15:00:00`,
      duration_min: 15,
    })
  })
  return missions
}

export default function Planning() {
  const navigate = useNavigate()
  const [weekOffset, setWeekOffset] = useState(0)
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)

  const weekDates = getWeekDates(weekOffset)
  const weekStart = weekDates[0].toISOString().split('T')[0]
  const weekEnd = weekDates[6].toISOString().split('T')[0]

  useEffect(() => {
    setLoading(true)
    api.get<Mission[]>('/api/menage', {
      params: { date_from: weekStart, date_to: weekEnd, assigned_to_me: true },
    })
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : []
        setMissions(data.length > 0 ? data : getMockWeekMissions(weekDates))
      })
      .catch(() => setMissions(getMockWeekMissions(weekDates)))
      .finally(() => setLoading(false))
  }, [weekStart, weekEnd])

  const today = new Date().toISOString().split('T')[0]
  const isCurrentWeek = weekOffset === 0

  const missionsForDay = (date: Date) => {
    const ds = date.toISOString().split('T')[0]
    return missions
      .filter(m => (m.scheduled_at ?? '').startsWith(ds))
      .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
  }

  const weekLabel = (() => {
    const start = weekDates[0]
    const end = weekDates[6]
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    return `${fmt(start)} – ${fmt(end)}`
  })()

  return (
    <div className="flex flex-col min-h-screen bg-bg safe-top safe-bottom">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-dark">Planning</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(o => o - 1)}
            className="w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center active:scale-95">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setWeekOffset(0)}
            className={`flex-1 text-center text-sm font-medium rounded-lg py-1.5 transition-colors ${
              isCurrentWeek ? 'bg-primary text-white' : 'bg-bg border border-border text-dark'
            }`}>
            {weekLabel}
          </button>
          <button onClick={() => setWeekOffset(o => o + 1)}
            className="w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center active:scale-95">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day columns */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-4 py-3 space-y-4">
            {weekDates.map((date, dayIdx) => {
              const ds = date.toISOString().split('T')[0]
              const isToday = ds === today
              const dayMissions = missionsForDay(date)
              return (
                <div key={ds}>
                  {/* Day header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isToday ? 'bg-primary text-white' : 'bg-bg border border-border text-dark'
                    }`}>
                      {date.getDate()}
                    </div>
                    <div>
                      <span className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-dark'}`}>
                        {DAYS[dayIdx]}
                      </span>
                      {isToday && <span className="ml-1.5 text-xs text-primary font-medium">Aujourd'hui</span>}
                    </div>
                    {dayMissions.length > 0 && (
                      <span className="ml-auto text-xs text-muted">
                        {dayMissions.filter(m => m.status === 'done').length}/{dayMissions.length}
                        {' '}✓
                      </span>
                    )}
                  </div>

                  {/* Missions */}
                  {dayMissions.length === 0 ? (
                    <p className="text-xs text-muted px-2 py-1">Aucune mission</p>
                  ) : (
                    <div className="space-y-2">
                      {dayMissions.map(m => (
                        <button
                          key={m.id}
                          onClick={() => navigate(`/missions/${m.id}`)}
                          className={`w-full text-left border-l-4 rounded-r-xl px-3 py-2.5 active:scale-[0.99] transition-transform ${TYPE_COLORS[m.type] ?? 'border-l-gray-400 bg-gray-50'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {m.status === 'done' && <CheckCircle2 size={13} className="text-success flex-shrink-0" />}
                                <p className={`text-sm font-semibold truncate ${m.status === 'done' ? 'line-through text-muted' : 'text-dark'}`}>
                                  {m.logement_name ?? 'Logement'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted">{TYPE_LABELS[m.type]}</span>
                                {m.scheduled_at && (
                                  <span className="text-xs text-muted flex items-center gap-0.5">
                                    <Clock size={10} />
                                    {new Date(m.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </div>
                            {m.priority === 'urgent' && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full flex-shrink-0">URG</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
