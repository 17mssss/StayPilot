import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type AgentStatus = 'pending' | 'approved' | 'declined'

export interface AgentProfile {
  id: string
  full_name: string
  email: string
  status: AgentStatus
  concierge_id: string | null
  team_id: string | null
}

interface AuthContextType {
  user: User | null
  agent: AgentProfile | null
  loading: boolean
  agentLoading: boolean
  logout: () => Promise<void>
  refreshAgent: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [agent, setAgent] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [agentLoading, setAgentLoading] = useState(false)

  const fetchAgent = async (userId: string) => {
    setAgentLoading(true)
    const { data } = await supabase
      .from('cleaning_agents')
      .select('id, full_name, email, status, concierge_id, team_id')
      .eq('user_id', userId)
      .maybeSingle()
    setAgent(data ?? null)
    setAgentLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) await fetchAgent(u.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        await fetchAgent(u.id)
      } else {
        setAgent(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const refreshAgent = async () => {
    if (user) await fetchAgent(user.id)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setAgent(null)
  }

  return (
    <AuthContext.Provider value={{ user, agent, loading, agentLoading, logout, refreshAgent }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
