import React from 'react'
import { X, Check, Zap, Crown, Star, ArrowRight } from 'lucide-react'
import { PLANS, type PlanId, type PlanConfig } from '../contexts/PlanContext'
import { usePlan } from '../contexts/PlanContext'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  reason?: string         // Ex: "Vous avez atteint la limite de 3 logements"
  minPlan?: PlanId        // Plan minimum requis pour débloquer
}

const ICONS = { starter: Star, pro: Zap, business: Crown }
const FEATURE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  pricingDynamique: 'Pricing dynamique',
  facturationAuto: 'Facturation automatique',
  livretQR: 'Livret d\'accueil QR',
  maintenance: 'Gestion maintenances',
  reviewAutopilot: 'Review autopilot',
  exportComptable: 'Export comptable',
  serrures: 'Serrures connectées',
  crmVoyageurs: 'CRM Voyageurs',
  whiteLabel: 'White Label',
  inboxIA: 'Inbox unifié + IA',
}

function PlanCard({ plan, current, onSelect }: { plan: PlanConfig; current: boolean; onSelect: () => void }) {
  const Icon = ICONS[plan.id]
  const features = Object.entries(plan.limits)
    .filter(([k, v]) => typeof v === 'boolean' && v)
    .map(([k]) => FEATURE_LABELS[k])
    .filter(Boolean)

  return (
    <div className={`relative rounded-xl border-2 p-5 flex flex-col gap-3 transition-all
      ${current ? 'border-gray-300 opacity-60' : `${plan.borderColor} cursor-pointer hover:shadow-md`}`}>
      {current && (
        <span className="absolute -top-3 left-4 bg-gray-500 text-white text-xs px-2 py-0.5 rounded-full">
          Plan actuel
        </span>
      )}
      {plan.id === 'pro' && !current && (
        <span className="absolute -top-3 left-4 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
          Recommandé
        </span>
      )}

      <div className="flex items-center gap-2">
        <span className={`p-1.5 rounded-lg ${plan.color}`}>
          <Icon className={`w-4 h-4 ${plan.textColor}`} />
        </span>
        <span className="font-bold text-gray-900 dark:text-white">{plan.name}</span>
      </div>

      <div>
        <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{plan.price}€</span>
        <span className="text-sm text-gray-500">/mois</span>
      </div>

      <div className="text-xs text-gray-500">
        {plan.limits.logements === -1 ? 'Biens illimités' : `Jusqu'à ${plan.limits.logements} biens`}
      </div>

      <ul className="space-y-1.5 flex-1">
        {features.slice(0, 5).map(f => (
          <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
            {f}
          </li>
        ))}
        {features.length > 5 && (
          <li className="text-xs text-gray-400">+ {features.length - 5} autres…</li>
        )}
      </ul>

      {!current && (
        <a
          href={plan.stripeLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-all
            ${plan.id === 'pro' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-800 hover:bg-gray-900'}`}
          onClick={onSelect}
        >
          Passer en {plan.name}
          <ArrowRight className="w-4 h-4" />
        </a>
      )}
    </div>
  )
}

export default function UpgradeModal({ open, onClose, reason, minPlan }: UpgradeModalProps) {
  const { planId } = usePlan()

  if (!open) return null

  const plansToShow = (Object.values(PLANS) as PlanConfig[]).filter(p => p.id !== planId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Changer d'abonnement
            </h2>
            {reason && (
              <p className="text-sm text-orange-600 mt-1">⚠️ {reason}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plans */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.values(PLANS) as PlanConfig[]).map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={plan.id === planId}
              onSelect={onClose}
            />
          ))}
        </div>

        <div className="px-6 pb-5 text-center text-xs text-gray-400">
          Sans engagement · Résiliable à tout moment · Passage au plan supérieur immédiat
        </div>
      </div>
    </div>
  )
}
