import React from 'react'
import { useDemo } from '../contexts/DemoContext'
import { X, Sparkles, Check, Zap } from 'lucide-react'
import { PLANS } from '../contexts/PlanContext'

const PRO_FEATURES = [
  'Messages automatiques IA',
  'Pricing dynamique',
  'Facturation automatique',
  'Livrets QR personnalisés',
  'CRM Voyageurs',
  'Maintenances',
  'Jusqu\'à 15 logements',
]

const BUSINESS_FEATURES = [
  'Tout le plan Pro',
  'Portail Investisseur',
  'Export FEC comptable',
  'Logements illimités',
  'White-label',
  'Serrures connectées',
  'Inbox Unifié IA',
]

export default function DemoUpgradeModal() {
  const { showUpgradeModal, closeUpgrade } = useDemo()

  if (!showUpgradeModal) return null

  const pro      = PLANS['pro']
  const business = PLANS['business']

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeUpgrade}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden animate-[fadeIn_0.2s_ease]">

        {/* Header */}
        <div className="relative bg-gradient-to-r from-violet-600 to-indigo-500 px-6 pt-6 pb-8 text-white">
          <button
            onClick={closeUpgrade}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X size={13} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles size={15} />
            </div>
            <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
              Mode démo
            </span>
          </div>

          <h2 className="text-xl font-bold mt-2">
            Cette action est réservée aux abonnés
          </h2>
          <p className="text-sm text-white/80 mt-1">
            Vous explorez StayPilot en mode démo. Passez à un plan payant pour débloquer toutes les actions.
          </p>
        </div>

        {/* Plans */}
        <div className="px-6 py-5 grid grid-cols-2 gap-3">

          {/* Pro */}
          <div className="border border-orange-200 rounded-xl p-4 bg-orange-50/50">
            <div className="flex items-center gap-1.5 mb-3">
              <Zap size={14} className="text-orange-500" />
              <span className="text-sm font-bold text-dark">Plan Pro</span>
            </div>
            <div className="mb-3">
              <span className="text-2xl font-bold text-dark">{pro.promoPrice ?? pro.price}€</span>
              <span className="text-xs text-muted">/mois</span>
              {pro.promoPrice && pro.regularPrice && (
                <p className="text-[10px] text-orange-500 font-medium mt-0.5">
                  Puis {pro.regularPrice}€ après {pro.promoDuration}
                </p>
              )}
            </div>
            <ul className="space-y-1.5 mb-4">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-1.5 text-xs text-dark">
                  <Check size={11} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={pro.stripeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors"
            >
              Choisir Pro
            </a>
          </div>

          {/* Business */}
          <div className="border-2 border-violet-400 rounded-xl p-4 bg-violet-50/50 relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <span className="text-[9px] font-bold bg-violet-500 text-white px-2 py-0.5 rounded-full">
                Populaire
              </span>
            </div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-sm">👑</span>
              <span className="text-sm font-bold text-dark">Business</span>
            </div>
            <div className="mb-3">
              <span className="text-2xl font-bold text-dark">Sur devis</span>
            </div>
            <ul className="space-y-1.5 mb-4">
              {BUSINESS_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-1.5 text-xs text-dark">
                  <Check size={11} className="text-violet-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="mailto:contact@staypilot.cc?subject=Demande%20plan%20Business"
              className="block w-full text-center py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
            >
              Nous contacter
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 text-center">
          <button
            onClick={closeUpgrade}
            className="text-xs text-muted hover:text-dark transition-colors underline underline-offset-2"
          >
            Continuer en mode démo
          </button>
        </div>
      </div>
    </div>
  )
}
