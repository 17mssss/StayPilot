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
  accessToken: string | null
  logout: () => Promise<void>
  refreshAgent: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]             = useState<User | null>(null)
  const [agent, setAgent]           = useState<AgentProfile | null>(null)
  const [loading, setLoading]       = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const fetchAgent = async (userId: string, jwt?: string): Promise<void> => {
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
      const token = jwt ?? SUPABASE_KEY
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/cleaning_agents?select=id,full_name,email,status,concierge_id,team_id&user_id=eq.${userId}&limit=1`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` } }
      )
      if (!res.ok) { setAgent(null); return }
      const rows = await res.json()
      setAgent(Array.isArray(rows) && rows.length > 0 ? rows[0] : null)
    } catch {
      setAgent(null)
    }
  }

  useEffect(() => {
    let mounted = true

    // Timeout de sécurité : si tout échoue, on sort du spinner au bout de 5s
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

    // Récupération initiale de la session (fiable)
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return
        const u = session?.user ?? null
        setUser(u)
        setAccessToken(session?.access_token ?? null)
        if (u) await fetchAgent(u.id, session?.access_token)
        setLoading(false)
        clearTimeout(timeout)
      })
      .catch(() => {
        if (mounted) setLoading(false)
        clearTimeout(timeout)
      })

    // Écoute des changements ultérieurs (login / logout / refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        // INITIAL_SESSION est déjà géré par getSession() ci-dessus
        if (event === 'INITIAL_SESSION') return
        const u = session?.user ?? null
        setUser(u)
        setAccessToken(session?.access_token ?? null)
        if (u) {
          await fetchAgent(u.id, session?.access_token)
        } else {
          setAgent(null)
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const refreshAgent = async () => {
    if (user) {
      const { data: { session } } = await supabase.auth.getSession()
      await fetchAgent(user.id, session?.access_token)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setAgent(null)
    setAccessToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, agent, loading, accessToken, logout, refreshAgent }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
