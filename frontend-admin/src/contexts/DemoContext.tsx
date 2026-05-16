import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

const STORAGE_TOKEN_KEY   = 'staypilot_demo_token'
const STORAGE_EXPIRES_KEY = 'staypilot_demo_expires'

interface DemoContextType {
  isDemo:          boolean
  demoToken:       string | null
  expiresAt:       number | null  // timestamp ms
  remainingMs:     number
  startDemo:       (token: string, expiresAt: number) => void
  exitDemo:        () => void
  showUpgradeModal:boolean
  triggerUpgrade:  () => void
  closeUpgrade:    () => void
}

const DemoContext = createContext<DemoContextType | undefined>(undefined)

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [demoToken, setDemoToken]             = useState<string | null>(() => localStorage.getItem(STORAGE_TOKEN_KEY))
  const [expiresAt, setExpiresAt]             = useState<number | null>(() => {
    const v = localStorage.getItem(STORAGE_EXPIRES_KEY)
    return v ? parseInt(v, 10) : null
  })
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isDemo = !!(demoToken && expiresAt && Date.now() < expiresAt)
  const remainingMs = isDemo ? (expiresAt! - Date.now()) : 0

  const startDemo = useCallback((token: string, exp: number) => {
    localStorage.setItem(STORAGE_TOKEN_KEY,   token)
    localStorage.setItem(STORAGE_EXPIRES_KEY, String(exp))
    setDemoToken(token)
    setExpiresAt(exp)

    // Auto-exit quand le token expire
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      if (Date.now() >= exp) {
        clearInterval(intervalRef.current!)
        exitDemo()
      }
    }, 60_000)
  }, [])

  const exitDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN_KEY)
    localStorage.removeItem(STORAGE_EXPIRES_KEY)
    setDemoToken(null)
    setExpiresAt(null)
  }, [])

  const triggerUpgrade = useCallback(() => setShowUpgradeModal(true),  [])
  const closeUpgrade   = useCallback(() => setShowUpgradeModal(false), [])

  return (
    <DemoContext.Provider value={{
      isDemo, demoToken, expiresAt, remainingMs,
      startDemo, exitDemo,
      showUpgradeModal, triggerUpgrade, closeUpgrade,
    }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used inside DemoProvider')
  return ctx
}
