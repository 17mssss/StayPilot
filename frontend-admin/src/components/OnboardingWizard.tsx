import React, { useEffect, useState } from 'react'
import { X, Home, Users, Smartphone, CheckCircle2, ArrowRight, Rocket, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

const WIZARD_KEY = 'staypilot_wizard_done'

interface Step {
  id: number
  icon: React.ReactNode
  title: string
  description: string
  cta: string
  route: string
  color: string
  bgColor: string
}

const STEPS: Step[] = [
  {
    id: 1,
    icon: <Home size={22} />,
    title: 'Ajouter votre premier logement',
    description: 'Commencez par créer un logement. Donnez-lui un nom, une adresse et connectez-le à votre channel manager (Airbnb, Booking, etc.).',
    cta: 'Ajouter un logement',
    route: '/logements',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    id: 2,
    icon: <Users size={22} />,
    title: 'Inviter votre premier propriétaire',
    description: 'Envoyez une invitation à votre premier propriétaire. Il pourra suivre ses revenus et missions depuis son espace dédié.',
    cta: 'Gérer les propriétaires',
    route: '/proprietaires',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 3,
    icon: <Smartphone size={22} />,
    title: 'Connecter CleanPilot',
    description: 'Partagez le lien CleanPilot à votre équipe de ménage. Ils pourront recevoir leurs missions et envoyer des rapports depuis leur téléphone.',
    cta: 'Voir le code de connexion',
    route: '/parametres',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
]

export default function OnboardingWizard() {
  const [show, setShow] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const done = localStorage.getItem(WIZARD_KEY)
    if (done) { setChecking(false); return }

    // Vérifier si l'utilisateur a déjà des logements
    api.get('/api/logements')
      .then((r: any) => {
        const logements = Array.isArray(r.data) ? r.data : []
        if (logements.length === 0) {
          // Nouvel utilisateur — afficher le wizard après 1.5s
          setTimeout(() => setShow(true), 1500)
        }
      })
      .catch(() => {
        setTimeout(() => setShow(true), 1500)
      })
      .finally(() => setChecking(false))
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(WIZARD_KEY, '1')
    setShow(false)
  }

  const handleStepClick = (step: Step) => {
    setCompletedSteps(prev => prev.includes(step.id) ? prev : [...prev, step.id])
    navigate(step.route)
    // Si toutes les étapes complétées, on attend 2s et on ferme
    if (completedSteps.length + 1 >= STEPS.length) {
      setTimeout(() => {
        localStorage.setItem(WIZARD_KEY, '1')
        setShow(false)
      }, 2000)
    }
  }

  const allDone = completedSteps.length >= STEPS.length

  if (checking || !show) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9980] transition-opacity"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-lg pointer-events-auto animate-in fade-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
                <Rocket size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-dark">Bienvenue sur StayPilot !</h2>
                <p className="text-xs text-muted">Suivez ces 3 étapes pour démarrer en 5 minutes</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted hover:text-dark transition-colors mt-0.5"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(completedSteps.length / STEPS.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted font-medium">{completedSteps.length}/{STEPS.length}</span>
            </div>
          </div>

          {/* Steps */}
          <div className="px-6 pb-5 flex flex-col gap-3">
            {STEPS.map((step) => {
              const done = completedSteps.includes(step.id)
              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step)}
                  className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 group ${
                    done
                      ? 'bg-green-50 border-green-200 opacity-70'
                      : 'border-border hover:border-primary/40 hover:shadow-sm'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    done ? 'bg-green-100' : step.bgColor
                  }`}>
                    {done
                      ? <CheckCircle2 size={18} className="text-green-600" />
                      : <span className={step.color}>{step.icon}</span>
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-medium ${done ? 'text-green-700 line-through' : 'text-dark'}`}>
                        {step.title}
                      </span>
                      {done && (
                        <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Fait</span>
                      )}
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{step.description}</p>
                  </div>

                  {/* Arrow */}
                  {!done && (
                    <ChevronRight size={16} className="text-muted group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <button
              onClick={handleDismiss}
              className="text-xs text-muted hover:text-dark transition-colors"
            >
              Faire ça plus tard
            </button>
            {allDone && (
              <button
                onClick={handleDismiss}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-colors"
              >
                <Rocket size={13} /> C'est parti !
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export function resetWizard() {
  localStorage.removeItem(WIZARD_KEY)
  window.location.reload()
}
