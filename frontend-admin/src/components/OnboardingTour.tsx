import React, { useEffect, useState, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft, Rocket, LayoutDashboard, Calendar, Home, MessageSquare, Receipt, Users, Settings, UserCircle } from 'lucide-react'

// ── Clé localStorage ──────────────────────────────────────────────────────────
const TOUR_KEY = 'staypilot_tour_done'

// ── Définition des étapes ─────────────────────────────────────────────────────
interface TourStep {
  target: string | null   // sélecteur data-tour, null = modal centré
  title: string
  description: string
  icon: React.ReactNode
  position?: 'right' | 'left' | 'bottom' | 'top'
}

const STEPS: TourStep[] = [
  {
    target: null,
    title: 'Bienvenue sur StayPilot ! 🚀',
    description: 'En quelques étapes, on va vous montrer comment piloter votre conciergerie. Ce tour dure moins d\'une minute.',
    icon: <Rocket size={28} className="text-primary" />,
  },
  {
    target: 'nav-dashboard',
    title: 'Tableau de bord',
    description: 'Ici vous avez une vue d\'ensemble : réservations du jour, revenus du mois, logements actifs et alertes en temps réel.',
    icon: <LayoutDashboard size={22} className="text-primary" />,
    position: 'right',
  },
  {
    target: 'nav-reservations',
    title: 'Réservations',
    description: 'Toutes vos réservations Airbnb, Booking.com et autres plateformes sont centralisées ici. Confirmez, annulez, suivez le statut.',
    icon: <Calendar size={22} className="text-primary" />,
    position: 'right',
  },
  {
    target: 'nav-logements',
    title: 'Logements',
    description: 'Ajoutez vos logements et connectez vos comptes Airbnb / Booking.com pour synchroniser automatiquement les réservations.',
    icon: <Home size={22} className="text-primary" />,
    position: 'right',
  },
  {
    target: 'nav-messages',
    title: 'Messagerie IA',
    description: 'L\'IA répond automatiquement aux messages de vos voyageurs : check-in, accès, questions fréquentes. Zéro effort de votre côté.',
    icon: <MessageSquare size={22} className="text-primary" />,
    position: 'right',
  },
  {
    target: 'nav-facturation',
    title: 'Facturation',
    description: 'Générez vos factures de commission en saisie manuelle ou en important un fichier Excel. Créez aussi des relevés mensuels par propriétaire.',
    icon: <Receipt size={22} className="text-primary" />,
    position: 'right',
  },
  {
    target: 'nav-proprietaires',
    title: 'Propriétaires',
    description: 'Gérez vos propriétaires : coordonnées, logements associés, historique des relevés. Chaque propriétaire reçoit son relevé mensuel personnalisé.',
    icon: <Users size={22} className="text-primary" />,
    position: 'right',
  },
  {
    target: 'nav-parametres',
    title: 'Paramètres',
    description: 'Personnalisez l\'interface : police, thème sombre/clair, taux de commission par défaut, infos société pour les PDF.',
    icon: <Settings size={22} className="text-primary" />,
    position: 'right',
  },
  {
    target: 'tour-account',
    title: 'Votre compte',
    description: 'Cliquez sur votre avatar pour modifier votre nom, email, mot de passe et choisir votre avatar pilote.',
    icon: <UserCircle size={22} className="text-primary" />,
    position: 'left',
  },
  {
    target: null,
    title: 'Vous êtes prêt ! ✅',
    description: 'StayPilot est configuré pour vous. Commencez par ajouter votre premier logement et connecter votre compte Airbnb. Bonne conciergerie !',
    icon: <Rocket size={28} className="text-primary" />,
  },
]

// ── Overlay spotlight : 4 panneaux autour de l'élément ───────────────────────
function SpotlightOverlay({
  rect, padding = 10,
}: {
  rect: DOMRect | null
  padding?: number
}) {
  if (!rect) {
    // Overlay plein écran pour les étapes sans cible
    return (
      <div className="fixed inset-0 bg-black/70 z-[9990] pointer-events-none" />
    )
  }

  const { top, left, bottom, right } = rect
  const w = window.innerWidth
  const h = window.innerHeight
  const t = Math.max(0, top - padding)
  const l = Math.max(0, left - padding)
  const b = Math.min(h, bottom + padding)
  const r = Math.min(w, right + padding)

  const style = 'fixed bg-black/70 z-[9990] pointer-events-none transition-all duration-300'

  return (
    <>
      {/* Haut */}
      <div className={style} style={{ top: 0, left: 0, right: 0, height: t }} />
      {/* Bas */}
      <div className={style} style={{ top: b, left: 0, right: 0, bottom: 0 }} />
      {/* Gauche */}
      <div className={style} style={{ top: t, left: 0, width: l, height: b - t }} />
      {/* Droite */}
      <div className={style} style={{ top: t, left: r, right: 0, height: b - t }} />
    </>
  )
}

// ── Tooltip positionné ────────────────────────────────────────────────────────
function Tooltip({
  step, stepIndex, total, rect, onNext, onPrev, onSkip,
}: {
  step: TourStep
  stepIndex: number
  total: number
  rect: DOMRect | null
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}) {
  const isFirst = stepIndex === 0
  const isLast  = stepIndex === total - 1
  const TOOLTIP_W = 300
  const TOOLTIP_H = 200 // estimation
  const PADDING   = 14

  // Position du tooltip
  let style: React.CSSProperties = {}

  if (!rect) {
    // Centré
    style = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: TOOLTIP_W,
    }
  } else {
    const pos = step.position ?? 'right'
    const vw  = window.innerWidth
    const vh  = window.innerHeight

    if (pos === 'right') {
      let left = rect.right + PADDING
      if (left + TOOLTIP_W > vw) left = rect.left - TOOLTIP_W - PADDING
      const top = Math.min(Math.max(rect.top, PADDING), vh - TOOLTIP_H - PADDING)
      style = { position: 'fixed', top, left, width: TOOLTIP_W }
    } else if (pos === 'left') {
      let left = rect.left - TOOLTIP_W - PADDING
      if (left < 0) left = rect.right + PADDING
      const top = Math.min(Math.max(rect.top, PADDING), vh - TOOLTIP_H - PADDING)
      style = { position: 'fixed', top, left, width: TOOLTIP_W }
    } else if (pos === 'bottom') {
      const top  = rect.bottom + PADDING
      const left = Math.min(Math.max(rect.left, PADDING), vw - TOOLTIP_W - PADDING)
      style = { position: 'fixed', top, left, width: TOOLTIP_W }
    } else {
      const top  = rect.top - TOOLTIP_H - PADDING
      const left = Math.min(Math.max(rect.left, PADDING), vw - TOOLTIP_W - PADDING)
      style = { position: 'fixed', top, left, width: TOOLTIP_W }
    }
  }

  return (
    <div
      style={{ ...style, zIndex: 9999 }}
      className="bg-surface border border-border rounded-2xl shadow-2xl p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
            {step.icon}
          </div>
          <p className="text-sm font-bold text-dark leading-tight">{step.title}</p>
        </div>
        <button onClick={onSkip}
          className="text-muted hover:text-dark transition-colors flex-shrink-0 mt-0.5">
          <X size={14} />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-muted leading-relaxed">{step.description}</p>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {/* Points de progression */}
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === stepIndex ? 'w-5 bg-primary' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Boutons */}
        <div className="flex gap-2">
          {!isFirst && (
            <button onClick={onPrev}
              className="flex items-center gap-1 text-xs text-muted hover:text-dark border border-border rounded-lg px-3 py-1.5 transition-colors">
              <ChevronLeft size={13} /> Préc.
            </button>
          )}
          {isLast ? (
            <button onClick={onNext}
              className="flex items-center gap-1 text-xs text-white bg-primary hover:bg-primary-dark rounded-lg px-4 py-1.5 font-medium transition-colors">
              Terminer <Rocket size={13} />
            </button>
          ) : (
            <button onClick={onNext}
              className="flex items-center gap-1 text-xs text-white bg-primary hover:bg-primary-dark rounded-lg px-3 py-1.5 font-medium transition-colors">
              Suivant <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Skip */}
      {!isLast && (
        <button onClick={onSkip}
          className="text-center text-xs text-muted hover:text-dark transition-colors -mt-1">
          Passer le tutoriel
        </button>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function OnboardingTour() {
  const [active, setActive]   = useState(false)
  const [step,   setStep]     = useState(0)
  const [rect,   setRect]     = useState<DOMRect | null>(null)

  // Démarrer au premier login
  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY)
    if (!done) {
      // Petit délai pour laisser le layout se rendre
      const t = setTimeout(() => setActive(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  // Calculer le rect de l'élément cible à chaque changement d'étape
  const updateRect = useCallback(() => {
    const target = STEPS[step]?.target
    if (!target) { setRect(null); return }
    const el = document.querySelector(`[data-tour="${target}"]`)
    if (el) {
      setRect(el.getBoundingClientRect())
      // Scroll l'élément en vue si besoin
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    } else {
      setRect(null)
    }
  }, [step])

  useEffect(() => {
    if (!active) return
    updateRect()
    window.addEventListener('resize', updateRect)
    return () => window.removeEventListener('resize', updateRect)
  }, [active, step, updateRect])

  // Pulse sur l'élément cible
  useEffect(() => {
    if (!active) return
    const target = STEPS[step]?.target
    if (!target) return
    const el = document.querySelector(`[data-tour="${target}"]`) as HTMLElement | null
    if (!el) return
    el.classList.add('tour-highlight')
    return () => el.classList.remove('tour-highlight')
  }, [active, step])

  const finish = () => {
    localStorage.setItem(TOUR_KEY, '1')
    setActive(false)
  }

  const next = () => {
    if (step >= STEPS.length - 1) { finish(); return }
    setStep(s => s + 1)
  }

  const prev = () => {
    if (step > 0) setStep(s => s - 1)
  }

  if (!active) return null

  return (
    <>
      {/* Injecter le CSS de highlight si absent */}
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 9995 !important;
          outline: 3px solid var(--color-primary, #e8611a) !important;
          outline-offset: 4px;
          border-radius: 10px;
          animation: tour-pulse 1.4s ease-in-out infinite;
        }
        @keyframes tour-pulse {
          0%, 100% { outline-color: #e8611a; box-shadow: 0 0 0 0 rgba(232,97,26,0.4); }
          50%       { outline-color: #ff8c3a; box-shadow: 0 0 0 8px rgba(232,97,26,0); }
        }
      `}</style>

      {/* Overlay spotlight */}
      <SpotlightOverlay rect={rect} />

      {/* Tooltip */}
      <Tooltip
        step={STEPS[step]}
        stepIndex={step}
        total={STEPS.length}
        rect={rect}
        onNext={next}
        onPrev={prev}
        onSkip={finish}
      />
    </>
  )
}

// ── Utilitaire : relancer le tour (depuis Paramètres par ex.) ─────────────────
export function resetTour() {
  localStorage.removeItem(TOUR_KEY)
  window.location.reload()
}
