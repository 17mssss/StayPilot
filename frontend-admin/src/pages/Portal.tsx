import { useNavigate } from 'react-router-dom'
import { ArrowRight, LayoutDashboard, Home, Sparkles, LogOut, Lock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePlan } from '../contexts/PlanContext'
import { useEffect, useState } from 'react'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Bonjour'
  if (h >= 12 && h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function getUserFirstName(user: any): string {
  const full =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    ''
  return full.split(/[\s_.-]/)[0]
}

export default function Portal() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { planId } = usePlan()

  const isStarter = planId === 'starter'
  const firstName = getUserFirstName(user)
  const greeting = getGreeting()

  const welcomeKey = `sp_welcomed_${user?.id}`
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return false
    return !localStorage.getItem(welcomeKey)
  })
  const [welcomePhase, setWelcomePhase] = useState<'in' | 'out'>('in')
  const [cardsVisible, setCardsVisible] = useState(!showWelcome)

  useEffect(() => {
    if (!showWelcome) return
    const t1 = setTimeout(() => setWelcomePhase('out'), 2500)
    const t2 = setTimeout(() => {
      setShowWelcome(false)
      setCardsVisible(true)
      localStorage.setItem(welcomeKey, '1')
    }, 3000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [showWelcome, welcomeKey])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const planLabel: Record<string, string> = {
    starter: 'Plan Starter · 2 espaces débloqués',
    pro: 'Plan Pro · 3 espaces débloqués',
    business: 'Plan Business · Accès complet',
  }

  const spaces = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      title: 'Espace Concierge',
      desc: 'Gérez réservations, logements, facturation et automatisations',
      action: 'internal' as const,
      path: '/',
      primary: true,
      locked: false,
    },
    {
      icon: Home,
      label: 'Owner App',
      title: 'Espace Propriétaire',
      desc: 'Revenus, calendrier et documents pour vos propriétaires',
      action: 'external' as const,
      path: 'https://owner.staypilot.cc',
      primary: false,
      locked: false,
    },
    {
      icon: Sparkles,
      label: 'CleanPilot',
      title: 'CleanPilot',
      desc: 'App terrain pour vos agents de ménage',
      action: 'external' as const,
      path: 'https://cleanpilot.staypilot.cc',
      primary: false,
      locked: isStarter,
    },
  ]

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#fafafa' }}
    >
      {/* Animated grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            'linear-gradient(to right, rgba(249,115,22,0.07) 1px, transparent 1px)',
            'linear-gradient(to bottom, rgba(249,115,22,0.07) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: '40px 40px',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, #fafafa 100%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          width: '640px',
          height: '480px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.11) 0%, transparent 65%)',
          animation: 'portal-glow 6s ease-in-out infinite',
        }}
      />

      {/* Welcome overlay */}
      {showWelcome && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            background: '#fafafa',
            transition: 'opacity 0.5s ease',
            opacity: welcomePhase === 'out' ? 0 : 1,
            pointerEvents: welcomePhase === 'out' ? 'none' : 'auto',
          }}
        >
          <div className="text-center px-6">
            <p
              className="text-sm font-semibold uppercase tracking-[0.2em] mb-4"
              style={{ color: '#f97316', animation: 'fadeSlideUp 0.6s ease both' }}
            >
              StayPilot
            </p>
            <h1
              className="font-bold mb-3"
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                color: '#111827',
                animation: 'fadeSlideUp 0.6s ease 0.15s both',
                lineHeight: 1.1,
              }}
            >
              {greeting}{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p
              className="text-base mb-8"
              style={{
                color: '#6b7280',
                animation: 'fadeSlideUp 0.6s ease 0.3s both',
              }}
            >
              {planLabel[planId] ?? 'Bienvenue dans votre espace StayPilot'}
            </p>
            <div style={{ animation: 'fadeSlideUp 0.6s ease 0.45s both' }}>
              <div
                className="mx-auto rounded-full overflow-hidden"
                style={{ width: '200px', height: '4px', background: '#f3f4f6' }}
              >
                <div
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #f97316, #fb923c)',
                    animation: 'progressBar 2.5s linear both',
                  }}
                />
              </div>
            </div>
            <button
              onClick={() => {
                setWelcomePhase('out')
                setTimeout(() => {
                  setShowWelcome(false)
                  setCardsVisible(true)
                  localStorage.setItem(welcomeKey, '1')
                }, 500)
              }}
              className="mt-6 text-xs hover:text-gray-600 transition-colors"
              style={{ color: '#9ca3af', animation: 'fadeSlideUp 0.6s ease 0.6s both' }}
            >
              Passer →
            </button>
          </div>
        </div>
      )}

      {/* Portal content */}
      <div
        className="relative z-10 flex flex-col items-center px-6 w-full max-w-2xl"
        style={{
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          opacity: cardsVisible ? 1 : 0,
          transform: cardsVisible ? 'translateY(0)' : 'translateY(12px)',
        }}
      >
        <img
          src="/logo.png"
          alt="StayPilot"
          style={{ height: '38px', width: 'auto' }}
          className="mb-2"
        />
        <p className="text-sm font-medium tracking-wide mb-10" style={{ color: '#9ca3af' }}>
          Choisissez votre espace
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          {spaces.map((s, i) => {
            const Icon = s.icon
            return (
              <button
                key={s.title}
                onClick={() => {
                  if (s.locked) {
                    window.open('https://staypilot.cc/#pricing', '_blank')
                    return
                  }
                  s.action === 'internal' ? navigate(s.path) : window.open(s.path, '_blank')
                }}
                className="group text-left rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md relative"
                style={{
                  ...(s.primary
                    ? {
                        background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                        border: '1px solid transparent',
                        boxShadow: '0 4px 20px rgba(249,115,22,0.22)',
                      }
                    : {
                        background: s.locked ? '#f9fafb' : '#ffffff',
                        border: '1px solid #e5e7eb',
                      }),
                  animation: cardsVisible ? `fadeSlideUp 0.5s ease ${i * 0.1}s both` : 'none',
                }}
              >
                {s.locked && (
                  <div
                    className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}
                  >
                    <Lock size={9} />
                    Pro
                  </div>
                )}

                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: s.primary
                      ? 'rgba(255,255,255,0.2)'
                      : s.locked
                      ? 'rgba(249,115,22,0.05)'
                      : 'rgba(249,115,22,0.08)',
                  }}
                >
                  {s.locked ? (
                    <Lock size={20} style={{ color: '#d1d5db' }} />
                  ) : (
                    <Icon size={20} style={{ color: s.primary ? '#ffffff' : '#f97316' }} />
                  )}
                </div>

                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: s.primary ? 'rgba(255,255,255,0.65)' : '#9ca3af' }}
                >
                  {s.label}
                </p>

                <h3
                  className="font-bold text-sm leading-snug mb-1.5"
                  style={{ color: s.primary ? '#ffffff' : s.locked ? '#9ca3af' : '#111827' }}
                >
                  {s.title}
                </h3>

                <p
                  className="text-xs leading-relaxed"
                  style={{ color: s.primary ? 'rgba(255,255,255,0.78)' : '#6b7280' }}
                >
                  {s.desc}
                </p>

                <div
                  className="flex items-center gap-1 mt-4 text-xs font-semibold"
                  style={{ color: s.primary ? '#ffffff' : s.locked ? '#d1d5db' : '#f97316' }}
                >
                  {s.locked ? 'Passer en Pro' : 'Accéder'}
                  <ArrowRight
                    size={12}
                    className="group-hover:translate-x-0.5 transition-transform duration-150"
                  />
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 mt-8 text-xs hover:text-gray-600 transition-colors"
          style={{ color: '#9ca3af' }}
        >
          <LogOut size={12} />
          Se déconnecter
        </button>
      </div>

      <style>{`
        @keyframes portal-glow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  )
}
