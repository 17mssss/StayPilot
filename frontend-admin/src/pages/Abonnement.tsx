import React, { useState } from 'react'
import { Check, Zap, Crown, Star, ArrowRight, Sparkles, Lock } from 'lucide-react'
import { PLANS, usePlan, type PlanConfig, type PlanId } from '../contexts/PlanContext'

// ── Feature list per plan ────────────────────────────────────────────────────
const PLAN_HIGHLIGHTS: Record<PlanId, string[]> = {
  starter: [
    'Jusqu\'à 3 logements',
    'Jusqu\'à 5 propriétaires',
    'Synchronisation multi-plateformes',
    'Messagerie email automatique',
    'Gestion du ménage',
    'Calendrier & réservations',
    'Facturation basique',
  ],
  pro: [
    'Jusqu\'à 15 logements',
    '50 propriétaires',
    'WhatsApp & SMS automatiques',
    'Facturation automatique',
    'Pricing dynamique',
    'Livrets d\'accueil QR code',
    'Gestion des maintenances',
    'Review autopilot (IA)',
  ],
  business: [
    'Logements & propriétaires illimités',
    'Tout le plan Pro inclus',
    'Export comptable avancé',
    'Serrures connectées',
    'CRM Voyageurs complet',
    'White Label (votre marque)',
    'Inbox unifié + IA dédiée',
    'Account manager dédié',
  ],
}

const PLAN_TAGLINES: Record<PlanId, string> = {
  starter:  'Pour démarrer et tester StayPilot avec vos premiers biens.',
  pro:      'Pour les conciergeries qui veulent tout automatiser.',
  business: 'Pour les agences multi-sites qui scalent sans limites.',
}

// ── Feature comparison table ─────────────────────────────────────────────────
const COMPARE_SECTIONS = [
  {
    title: 'Capacité',
    rows: [
      { label: 'Logements',      key: 'logements',    type: 'limit' as const },
      { label: 'Propriétaires',  key: 'proprietaires',type: 'limit' as const },
    ],
  },
  {
    title: 'Communication',
    rows: [
      { label: 'Messagerie email automatique', key: null,      type: 'always' as const },
      { label: 'WhatsApp',                     key: 'whatsapp',type: 'bool'   as const },
      { label: 'SMS',                          key: 'sms',     type: 'bool'   as const },
    ],
  },
  {
    title: 'Automatisation',
    rows: [
      { label: 'Facturation automatique',   key: 'facturationAuto',  type: 'bool' as const },
      { label: 'Pricing dynamique',         key: 'pricingDynamique', type: 'bool' as const },
      { label: 'Livret d\'accueil QR code', key: 'livretQR',         type: 'bool' as const },
      { label: 'Gestion maintenances',      key: 'maintenance',      type: 'bool' as const },
      { label: 'Review autopilot IA',       key: 'reviewAutopilot',  type: 'bool' as const },
    ],
  },
  {
    title: 'Enterprise',
    rows: [
      { label: 'Export comptable',  key: 'exportComptable', type: 'bool' as const },
      { label: 'Serrures connectées',key: 'serrures',       type: 'bool' as const },
      { label: 'CRM Voyageurs',     key: 'crmVoyageurs',    type: 'bool' as const },
      { label: 'White Label',       key: 'whiteLabel',      type: 'bool' as const },
      { label: 'Inbox unifié + IA', key: 'inboxIA',         type: 'bool' as const },
    ],
  },
]

function CellValue({
  plan,
  featureKey,
  type,
}: {
  plan: PlanConfig
  featureKey: string | null
  type: 'limit' | 'bool' | 'always'
}) {
  if (type === 'always') {
    return <Check className="w-4 h-4 text-green-500 mx-auto" />
  }
  if (!featureKey) return null
  const val = plan.limits[featureKey as keyof PlanConfig['limits']]
  if (type === 'limit') {
    return (
      <span className="text-sm font-semibold text-foreground">
        {val === -1 ? '∞' : val}
      </span>
    )
  }
  return val
    ? <Check className="w-4 h-4 text-green-500 mx-auto" />
    : <span className="text-muted-foreground/30 text-base">—</span>
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Abonnement() {
  const { plan: currentPlan, planId, setPlan } = usePlan()
  const [hover, setHover] = useState<PlanId | null>(null)
  const [switching, setSwitching] = useState<PlanId | null>(null)

  const plans = Object.values(PLANS) as PlanConfig[]

  const handleSwitch = async (id: PlanId) => {
    if (id === planId) return
    setSwitching(id)
    await setPlan(id)
    setSwitching(null)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-16">

      {/* ── Hero header ── */}
      <div className="text-center pt-4">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Choisissez votre plan
        </h1>
        <p className="mt-2 text-muted-foreground text-base max-w-md mx-auto">
          Sans engagement · Résiliable à tout moment · Changement immédiat
        </p>
      </div>

      {/* ── Plan cards ── */}
      <div className="grid md:grid-cols-3 gap-4 lg:gap-6 items-stretch">
        {plans.map((plan) => {
          const isCurrent = plan.id === planId
          const isHovered = hover === plan.id
          const isPro     = plan.id === 'pro'
          const isBusiness= plan.id === 'business'

          return (
            <div
              key={plan.id}
              onMouseEnter={() => setHover(plan.id)}
              onMouseLeave={() => setHover(null)}
              className={`
                relative flex flex-col rounded-2xl border-2 transition-all duration-200
                ${isCurrent
                  ? isPro
                    ? 'border-orange-400 shadow-[0_0_0_4px_rgba(249,115,22,0.12)]'
                    : isBusiness
                      ? 'border-purple-400 shadow-[0_0_0_4px_rgba(168,85,247,0.12)]'
                      : 'border-slate-400 shadow-md'
                  : isHovered
                    ? 'border-border shadow-lg -translate-y-1'
                    : 'border-border shadow-sm'
                }
                ${isPro ? 'bg-gradient-to-b from-orange-50/60 to-background dark:from-orange-950/20 dark:to-background' : 'bg-surface'}
                ${isBusiness ? 'bg-gradient-to-b from-purple-50/60 to-background dark:from-purple-950/20 dark:to-background' : ''}
              `}
            >
              {/* Badge top */}
              {isPro && (
                <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                  <span className="bg-orange-500 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                    LE PLUS POPULAIRE
                  </span>
                </div>
              )}
              {isCurrent && !isPro && (
                <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full shadow-sm ${plan.color} ${plan.textColor}`}>
                    PLAN ACTUEL
                  </span>
                </div>
              )}

              <div className="p-6 flex flex-col gap-5 flex-1">

                {/* Header plan */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold uppercase tracking-widest ${
                      isPro ? 'text-orange-500' : isBusiness ? 'text-purple-500' : 'text-muted-foreground'
                    }`}>
                      {plan.name}
                    </span>
                    {isCurrent && isPro && (
                      <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400 px-2 py-0.5 rounded-full">
                        Actuel
                      </span>
                    )}
                    {isCurrent && isBusiness && (
                      <span className="text-[10px] font-semibold bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400 px-2 py-0.5 rounded-full">
                        Actuel
                      </span>
                    )}
                    {isCurrent && plan.id === 'starter' && (
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full">
                        Actuel
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{PLAN_TAGLINES[plan.id]}</p>
                </div>

                {/* Prix */}
                {plan.isEnterprise ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-3xl font-extrabold tracking-tight text-purple-500">
                      Sur devis
                    </span>
                    <span className="text-xs text-muted-foreground">Contactez-nous pour un devis personnalisé</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-end gap-1">
                      <span className={`text-4xl font-extrabold tracking-tight ${
                        isPro ? 'text-orange-500' : 'text-foreground'
                      }`}>
                        {plan.promoPrice}€
                      </span>
                      <span className="text-muted-foreground text-sm mb-1.5">/mois</span>
                    </div>
                    {plan.promoDuration && plan.regularPrice && (
                      <p className="text-xs text-muted-foreground">
                        Pendant {plan.promoDuration}, puis{' '}
                        <span className="font-semibold">{plan.regularPrice}€/mois</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Feature list */}
                <ul className="space-y-2 flex-1">
                  {PLAN_HIGHLIGHTS[plan.id].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                        isPro ? 'text-orange-500' : isBusiness ? 'text-purple-500' : 'text-green-500'
                      }`} />
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className={`
                    text-center py-2.5 rounded-xl text-sm font-semibold
                    ${isPro
                      ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400'
                      : isBusiness
                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }
                  `}>
                    ✓ Votre plan actuel
                  </div>
                ) : (
                  <button
                    onClick={() => handleSwitch(plan.id)}
                    disabled={switching === plan.id}
                    className={`
                      flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
                      transition-all duration-150 disabled:opacity-60
                      ${isPro
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20'
                        : isBusiness
                          ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20'
                          : 'bg-foreground text-background hover:opacity-90'
                      }
                    `}
                  >
                    {switching === plan.id ? (
                      <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {plan.isEnterprise
                          ? 'Contacter les ventes'
                          : (plan.promoPrice ?? 0) > (currentPlan.promoPrice ?? 0)
                            ? `Passer à ${plan.name}`
                            : `Rétrograder en ${plan.name}`
                        }
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Garantie */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground flex-wrap">
        {['🔒 Paiement sécurisé Stripe', '↩ Remboursement 30 jours', '⚡ Activation immédiate', '📞 Support inclus'].map(t => (
          <span key={t}>{t}</span>
        ))}
      </div>

      {/* ── Tableau comparatif ── */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">Comparatif détaillé</h2>
        <div className="rounded-2xl border border-border overflow-hidden">

          {/* Header colonnes */}
          <div className="grid grid-cols-4 border-b border-border bg-muted/30">
            <div className="px-5 py-3" />
            {plans.map(plan => (
              <div key={plan.id} className="px-3 py-3 text-center">
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${plan.color} ${plan.textColor}`}>
                  {plan.name}
                  {plan.id === planId && ' ✓'}
                </span>
              </div>
            ))}
          </div>

          {/* Sections */}
          {COMPARE_SECTIONS.map((section) => (
            <div key={section.title}>
              {/* Section header */}
              <div className="grid grid-cols-4 bg-muted/10 border-b border-border">
                <div className="col-span-4 px-5 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {section.title}
                  </span>
                </div>
              </div>
              {/* Rows */}
              {section.rows.map((row, ri) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-4 border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                    ri % 2 === 0 ? '' : 'bg-muted/5'
                  }`}
                >
                  <div className="px-5 py-3 text-sm text-foreground/80">{row.label}</div>
                  {plans.map(plan => (
                    <div key={plan.id} className="px-3 py-3 flex items-center justify-center">
                      <CellValue plan={plan} featureKey={row.key} type={row.type} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-center text-muted-foreground">
          Tous les plans incluent la synchronisation multi-plateformes, le calendrier, les réservations et le support email.
          <br />
          Le changement de plan est effectif immédiatement. La différence est calculée au prorata.
        </p>
      </div>
    </div>
  )
}
