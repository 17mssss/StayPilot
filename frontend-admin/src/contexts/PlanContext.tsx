import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useDemo } from './DemoContext'

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlanId = 'starter' | 'pro' | 'business'

export interface PlanConfig {
  id: PlanId
  name: string
  label: string              // Affiché dans le badge
  color: string              // Tailwind bg color
  textColor: string          // Tailwind text color
  borderColor: string        // Tailwind border color
  price: number              // Prix affiché principal €/mois (promoPrice si dispo)
  promoPrice: number | null  // Prix promo temporaire
  regularPrice: number | null// Prix normal après promo
  promoDuration: string | null// Ex : "3 mois"
  isEnterprise: boolean      // Business sur devis
  limits: {
    logements: number    // -1 = illimité
    proprietaires: number
    whatsapp: boolean
    sms: boolean
    pricingDynamique: boolean
    facturationAuto: boolean
    livretQR: boolean
    maintenance: boolean
    reviewAutopilot: boolean
    exportComptable: boolean
    serrures: boolean
    crmVoyageurs: boolean
    whiteLabel: boolean
    inboxIA: boolean
  }
  stripeLink: string
}

export const PLANS: Record<PlanId, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    label: 'Starter',
    color: 'bg-slate-100',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-300',
    price: 59,
    promoPrice: 59,
    regularPrice: 99,
    promoDuration: '3 mois',
    isEnterprise: false,
    limits: {
      logements: 3,
      proprietaires: 5,
      whatsapp: false,
      sms: false,
      pricingDynamique: false,
      facturationAuto: false,
      livretQR: false,
      maintenance: false,
      reviewAutopilot: false,
      exportComptable: false,
      serrures: false,
      crmVoyageurs: false,
      whiteLabel: false,
      inboxIA: false,
    },
    stripeLink: import.meta.env.VITE_STRIPE_LINK_STARTER ?? 'https://buy.stripe.com/test_fZubJ34CN8iraqx0se6Vq00',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    label: '⚡ Pro',
    color: 'bg-orange-100',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-400',
    price: 99,
    promoPrice: 99,
    regularPrice: 149,
    promoDuration: '2 mois',
    isEnterprise: false,
    limits: {
      logements: 15,
      proprietaires: 50,
      whatsapp: true,
      sms: true,
      pricingDynamique: true,
      facturationAuto: true,
      livretQR: true,
      maintenance: true,
      reviewAutopilot: true,
      exportComptable: false,
      serrures: false,
      crmVoyageurs: false,
      whiteLabel: false,
      inboxIA: false,
    },
    stripeLink: import.meta.env.VITE_STRIPE_LINK_PRO ?? 'https://buy.stripe.com/test_8x2fZjb1b8ir8ip7UG6Vq01',
  },
  business: {
    id: 'business',
    name: 'Business',
    label: '👑 Business',
    color: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-400',
    price: 0,
    promoPrice: null,
    regularPrice: null,
    promoDuration: null,
    isEnterprise: true,
    limits: {
      logements: -1,
      proprietaires: -1,
      whatsapp: true,
      sms: true,
      pricingDynamique: true,
      facturationAuto: true,
      livretQR: true,
      maintenance: true,
      reviewAutopilot: true,
      exportComptable: true,
      serrures: true,
      crmVoyageurs: true,
      whiteLabel: true,
      inboxIA: true,
    },
    stripeLink: import.meta.env.VITE_STRIPE_LINK_BUSINESS ?? 'https://buy.stripe.com/test_4gMaEZedn56f56d2Am6Vq02',
  },
}

// ── Context ───────────────────────────────────────────────────────────────────

interface PlanContextType {
  plan: PlanConfig
  planId: PlanId
  loading: boolean
  canUse: (feature: keyof PlanConfig['limits']) => boolean
  isAtLimit: (feature: 'logements' | 'proprietaires', current: number) => boolean
  setPlan: (id: PlanId) => Promise<void>
}

const PlanContext = createContext<PlanContextType | undefined>(undefined)

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { isDemo } = useDemo()
  const [planId, setPlanId] = useState<PlanId>('starter')
  const [loading, setLoading] = useState(true)

  // Charger le plan depuis Supabase (user_metadata ou table profiles)
  useEffect(() => {
    if (!user) { setLoading(false); return }

    const loadPlan = async () => {
      // D'abord essayer user_metadata
      const metaPlan = user.user_metadata?.plan as PlanId | undefined
      if (metaPlan && PLANS[metaPlan]) {
        setPlanId(metaPlan)
        setLoading(false)
        return
      }

      // Sinon chercher dans la table profiles
      try {
        const { data } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single()
        if (data?.plan && PLANS[data.plan as PlanId]) {
          setPlanId(data.plan as PlanId)
        }
      } catch {
        // Table inexistante ou pas de données → rester sur starter
      }
      setLoading(false)
    }

    loadPlan()
  }, [user])

  const setPlan = async (id: PlanId) => {
    setPlanId(id)
    if (!user) return
    // Sauvegarder dans user_metadata
    await supabase.auth.updateUser({ data: { plan: id } })
    // Sauvegarder aussi dans profiles si la table existe
    try {
      await supabase.from('profiles').upsert({ id: user.id, plan: id })
    } catch { /* ignore */ }
  }

  const plan = PLANS[planId]

  // En mode démo, toutes les features sont débloquées (plan Enterprise fictif)
  const canUse = (feature: keyof PlanConfig['limits']): boolean => {
    if (isDemo) return true
    const val = plan.limits[feature]
    if (typeof val === 'boolean') return val
    return true // les limites numériques sont gérées par isAtLimit
  }

  const isAtLimit = (feature: 'logements' | 'proprietaires', current: number): boolean => {
    if (isDemo) return false // pas de limite en démo
    const limit = plan.limits[feature]
    if (limit === -1) return false // illimité
    return current >= limit
  }

  return (
    <PlanContext.Provider value={{ plan, planId, loading, canUse, isAtLimit, setPlan }}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan() {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error('usePlan must be used within PlanProvider')
  return ctx
}
