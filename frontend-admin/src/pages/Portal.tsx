import { useNavigate } from 'react-router-dom'
import { ArrowRight, LayoutDashboard, Home, Sparkles, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const spaces = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    title: 'Espace Concierge',
    desc: 'Gérez réservations, logements, facturation et automatisations',
    action: 'internal' as const,
    path: '/',
    primary: true,
  },
  {
    icon: Home,
    label: 'Owner App',
    title: 'Espace Propriétaire',
    desc: 'Revenus, calendrier et documents pour vos propriétaires',
    action: 'external' as const,
    path: 'https://owner.staypilot.cc',
    primary: false,
  },
  {
    icon: Sparkles,
    label: 'CleanPilot',
    title: 'CleanPilot',
    desc: 'App terrain pour vos agents de ménage',
    action: 'external' as const,
    path: 'https://cleanpilot.staypilot.cc',
    primary: false,
  },
]

export default function Portal() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

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

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, #fafafa 100%)',
        }}
      />

      {/* Center glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          width: '640px',
          height: '480px',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(249,115,22,0.11) 0%, transparent 65%)',
          animation: 'portal-glow 6s ease-in-out infinite',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-2xl">
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
          {spaces.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.title}
                onClick={() =>
                  s.action === 'internal'
                    ? navigate(s.path)
                    : window.open(s.path, '_blank')
                }
                className="group text-left rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                style={
                  s.primary
                    ? {
                        background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                        border: '1px solid transparent',
                        boxShadow: '0 4px 20px rgba(249,115,22,0.22)',
                      }
                    : {
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                      }
                }
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: s.primary
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(249,115,22,0.08)',
                  }}
                >
                  <Icon
                    size={20}
                    style={{ color: s.primary ? '#ffffff' : '#f97316' }}
                  />
                </div>

                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: s.primary ? 'rgba(255,255,255,0.65)' : '#9ca3af' }}
                >
                  {s.label}
                </p>

                <h3
                  className="font-bold text-sm leading-snug mb-1.5"
                  style={{ color: s.primary ? '#ffffff' : '#111827' }}
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
                  style={{ color: s.primary ? '#ffffff' : '#f97316' }}
                >
                  Accéder
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
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
