import React, { useEffect, useState, useCallback } from 'react'
import {
  Users, CheckCircle2, XCircle, Clock, Mail, RefreshCw,
  UserCheck, UserX, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentRow {
  id: string
  full_name: string
  email: string
  status: 'pending' | 'approved' | 'declined'
  created_at: string
  team_name?: string
  team_code?: string
}

interface TeamGroup {
  team_id: string | null
  team_name: string
  team_code: string
  agents: AgentRow[]
}

// ── Composants ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentRow['status'] }) {
  const cfg = {
    pending:  { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
    approved: { label: 'Approuvé',   cls: 'bg-green-100 text-green-700'   },
    declined: { label: 'Refusé',     cls: 'bg-red-100 text-red-600'       },
  }[status]
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function AgentCard({
  agent,
  onApprove,
  onDecline,
  updating,
}: {
  agent: AgentRow
  onApprove: (id: string) => void
  onDecline: (id: string) => void
  updating: string | null
}) {
  const isUpdating = updating === agent.id
  const date = new Date(agent.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-bg border border-border-light">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-primary">
          {agent.full_name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-dark truncate">{agent.full_name}</p>
        <p className="text-xs text-muted flex items-center gap-1 truncate">
          <Mail size={10} /> {agent.email}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <StatusBadge status={agent.status} />
          <span className="text-[11px] text-muted">{date}</span>
        </div>
      </div>

      {/* Actions */}
      {agent.status === 'pending' && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onApprove(agent.id)}
            disabled={isUpdating}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            {isUpdating ? <RefreshCw size={12} className="animate-spin" /> : <UserCheck size={12} />}
            Approuver
          </button>
          <button
            onClick={() => onDecline(agent.id)}
            disabled={isUpdating}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <UserX size={12} />
            Refuser
          </button>
        </div>
      )}

      {agent.status === 'approved' && (
        <button
          onClick={() => onDecline(agent.id)}
          disabled={isUpdating}
          className="flex-shrink-0 text-xs text-muted hover:text-red-500 transition-colors px-2 py-1 disabled:opacity-50"
        >
          {isUpdating ? <RefreshCw size={12} className="animate-spin" /> : 'Retirer'}
        </button>
      )}

      {agent.status === 'declined' && (
        <button
          onClick={() => onApprove(agent.id)}
          disabled={isUpdating}
          className="flex-shrink-0 text-xs text-primary hover:underline transition-colors px-2 py-1 disabled:opacity-50"
        >
          {isUpdating ? <RefreshCw size={12} className="animate-spin" /> : 'Réactiver'}
        </button>
      )}
    </div>
  )
}

function TeamSection({ group, onApprove, onDecline, updating }: {
  group: TeamGroup
  onApprove: (id: string) => void
  onDecline: (id: string) => void
  updating: string | null
}) {
  const [open, setOpen] = useState(true)
  const approvedCount = group.agents.filter(a => a.status === 'approved').length

  return (
    <div className="bg-surface rounded-xl shadow-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
          <Users size={15} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-dark">{group.team_name}</p>
          <p className="text-xs text-muted">
            Code équipe : <span className="font-mono font-bold tracking-wider">{group.team_code}</span>
            {' · '}{approvedCount}/{group.agents.length} approuvé{approvedCount > 1 ? 's' : ''}
          </p>
        </div>
        {open ? <ChevronUp size={15} className="text-muted flex-shrink-0" /> : <ChevronDown size={15} className="text-muted flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-border-light">
          <div className="pt-3 space-y-2">
            {group.agents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onApprove={onApprove}
                onDecline={onDecline}
                updating={updating}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function EquipeMenage() {
  const { user } = useAuth()
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [conciergeId, setConciergeId] = useState<string | null>(null)

  // Charger l'ID conciergerie de cet admin
  useEffect(() => {
    if (!user) return
    supabase
      .from('concierge_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setConciergeId(data?.id ?? null))
  }, [user])

  const fetchAgents = useCallback(async (silent = false) => {
    if (!conciergeId) return
    if (!silent) setLoading(true)
    else setRefreshing(true)

    // Fetch agents + leur équipe
    const { data } = await supabase
      .from('cleaning_agents')
      .select(`
        id, full_name, email, status, created_at,
        team_id,
        cleaning_teams ( team_name, team_code )
      `)
      .eq('concierge_id', conciergeId)
      .order('created_at', { ascending: false })

    if (data) {
      const rows: AgentRow[] = data.map((a: any) => ({
        id: a.id,
        full_name: a.full_name,
        email: a.email,
        status: a.status,
        created_at: a.created_at,
        team_name: a.cleaning_teams?.team_name ?? 'Sans équipe',
        team_code: a.cleaning_teams?.team_code ?? '——',
      }))
      setAgents(rows)
    }

    setLoading(false)
    setRefreshing(false)
  }, [conciergeId])

  useEffect(() => {
    if (conciergeId) fetchAgents()
  }, [conciergeId, fetchAgents])

  const updateStatus = async (agentId: string, status: 'approved' | 'declined') => {
    setUpdating(agentId)
    const { error } = await supabase
      .from('cleaning_agents')
      .update({ status })
      .eq('id', agentId)

    if (!error) {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status } : a))
    }
    setUpdating(null)
  }

  // Grouper par équipe
  const teamGroups: TeamGroup[] = React.useMemo(() => {
    const map = new Map<string, TeamGroup>()
    agents.forEach(agent => {
      const key = agent.team_code ?? 'none'
      if (!map.has(key)) {
        map.set(key, {
          team_id: null,
          team_name: agent.team_name ?? 'Sans équipe',
          team_code: agent.team_code ?? '——',
          agents: [],
        })
      }
      map.get(key)!.agents.push(agent)
    })
    return Array.from(map.values())
  }, [agents])

  const pending = agents.filter(a => a.status === 'pending')
  const approved = agents.filter(a => a.status === 'approved')

  // KPIs
  const stats = [
    { label: 'Demandes en attente', value: pending.length,  icon: Clock,        color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Agents approuvés',    value: approved.length, icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: 'Équipes actives',     value: teamGroups.filter(g => g.agents.some(a => a.status === 'approved')).length, icon: Users, color: 'text-primary', bg: 'bg-primary-light' },
  ]

  return (
    <div className="max-w-2xl space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-surface rounded-xl shadow-card p-3 text-center">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
              <s.icon size={16} className={s.color} />
            </div>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-muted mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Header + refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-dark">
          {pending.length > 0
            ? `${pending.length} demande${pending.length > 1 ? 's' : ''} en attente d'approbation`
            : 'Toutes les équipes'
          }
        </h2>
        <button
          onClick={() => fetchAgents(true)}
          disabled={refreshing}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-dark transition-colors"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={20} className="text-muted animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-surface rounded-xl shadow-card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-3">
            <Sparkles size={22} className="text-primary" />
          </div>
          <p className="text-sm font-semibold text-dark mb-1">Aucun agent encore</p>
          <p className="text-xs text-muted leading-relaxed max-w-xs mx-auto">
            Transmettez le code de votre conciergerie (visible dans Paramètres) à vos agents de ménage pour qu'ils créent leur compte CleanPilot.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Demandes en attente en premier */}
          {pending.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={12} /> Demandes en attente
              </p>
              {pending.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onApprove={(id) => updateStatus(id, 'approved')}
                  onDecline={(id) => updateStatus(id, 'declined')}
                  updating={updating}
                />
              ))}
            </div>
          )}

          {/* Équipes */}
          {teamGroups.map(group => (
            <TeamSection
              key={group.team_code}
              group={group}
              onApprove={(id) => updateStatus(id, 'approved')}
              onDecline={(id) => updateStatus(id, 'declined')}
              updating={updating}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        Les agents approuvés peuvent accéder à leurs missions dans l'application CleanPilot.
      </p>
    </div>
  )
}
