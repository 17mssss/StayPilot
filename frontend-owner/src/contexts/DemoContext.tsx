import React, { createContext, useContext, useState } from 'react'

const TOKEN_KEY = 'owner_demo_token'
const EXPIRES_KEY = 'owner_demo_expires'

interface DemoContextValue {
  isDemo: boolean
  demoEmail: string
  startDemo: (token: string, expiresAt: number) => void
  endDemo: () => void
}

const DemoContext = createContext<DemoContextValue>({
  isDemo: false,
  demoEmail: 'demo@staypilot.cc',
  startDemo: () => {},
  endDemo: () => {},
})

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [demoToken, setDemoToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  )
  const [expiresAt, setExpiresAt] = useState<number | null>(() => {
    const v = localStorage.getItem(EXPIRES_KEY)
    return v ? parseInt(v, 10) : null
  })

  const isDemo = !!(demoToken && expiresAt && Date.now() < expiresAt)

  const startDemo = (token: string, exp: number) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(EXPIRES_KEY, String(exp))
    setDemoToken(token)
    setExpiresAt(exp)
  }

  const endDemo = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRES_KEY)
    setDemoToken(null)
    setExpiresAt(null)
  }

  return (
    <DemoContext.Provider value={{ isDemo, demoEmail: 'demo@staypilot.cc', startDemo, endDemo }}>
      {children}
    </DemoContext.Provider>
  )
}

export const useDemo = () => useContext(DemoContext)
