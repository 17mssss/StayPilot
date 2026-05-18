import { motion, useMotionValue, useMotionTemplate, useAnimationFrame } from "framer-motion";
import { Check, Mail } from "lucide-react";
import React, { useState } from "react";

// 🔗 Stripe Payment Links (live)
const STRIPE_LINKS = {
  starter:  "https://buy.stripe.com/00w6oGb7ibfzecx3vJ5c400",
  pro:      "https://buy.stripe.com/eVq8wO6R283n7O93vJ5c401",
};

const plans = [
  {
    name: "Starter",
    price: "99",
    promoPrice: "59",
    promoDuration: "3 mois",
    limit: "Jusqu'à 3 biens",
    badge: null,
    features: [
      "Synchronisation multi-plateformes",
      "Messagerie automatique (email)",
      "Gestion du ménage",
      "Owner App basique",
    ],
    cta: "Commencer",
    stripeLink: STRIPE_LINKS.starter,
    popular: false,
    isEnterprise: false,
  },
  {
    name: "Pro",
    price: "149",
    promoPrice: "99",
    promoDuration: "2 mois",
    limit: "Jusqu'à 15 biens",
    badge: "Le plus populaire",
    features: [
      "Tout le plan Starter",
      "WhatsApp + SMS",
      "Owner App complète",
      "Facturation automatique",
      "Pricing dynamique",
      "Livret d'accueil QR code",
      "Gestion maintenances",
      "Review autopilot",
    ],
    cta: "Choisir Pro",
    stripeLink: STRIPE_LINKS.pro,
    popular: true,
    isEnterprise: false,
  },
  {
    name: "Enterprise",
    price: null,
    promoPrice: null,
    promoDuration: null,
    limit: "Biens illimités · Multi-agences",
    badge: "Sur devis",
    features: [
      "Tout le plan Pro",
      "Export comptable avancé",
      "Serrures connectées",
      "CRM Voyageurs",
      "White Label (votre marque)",
      "Inbox unifié + IA dédiée",
      "Account manager dédié",
      "SLA garanti",
    ],
    cta: "Nous contacter",
    stripeLink: "#contact",
    popular: false,
    isEnterprise: true,
  },
];

const GridPattern = ({ offsetX, offsetY, id }: { offsetX: any; offsetY: any; id: string }) => (
  <motion.svg className="absolute inset-0 h-full w-full" style={{ x: offsetX, y: offsetY }}>
    <defs>
      <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/30" />
      </pattern>
    </defs>
    <rect x="-40" y="-40" width="calc(100% + 80px)" height="calc(100% + 80px)" fill={`url(#${id})`} />
  </motion.svg>
);

const Pricing = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  // Index de la carte active : par défaut la Pro (index 1)
  const [activeIndex, setActiveIndex] = useState<number>(1);

  useAnimationFrame(() => {
    gridOffsetX.set((gridOffsetX.get() + 0.3) % 40);
    gridOffsetY.set((gridOffsetY.get() + 0.3) % 40);
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const maskImage = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <section
      id="pricing"
      className="relative py-10 md:py-16 overflow-hidden bg-background"
      onMouseMove={handleMouseMove}
    >
      {/* Base grid - subtle */}
      <div className="absolute inset-0 opacity-25 dark:opacity-40 pointer-events-none">
        <GridPattern id="pricing-grid-base" offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>
      {/* Active grid - mouse reveal */}
      <motion.div
        className="absolute inset-0 opacity-70 dark:opacity-90 pointer-events-none"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern id="pricing-grid-reveal" offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </motion.div>
      {/* Fade edges — adaptatif light/dark via CSS variable */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, hsl(var(--background)) 75%)' }}
      />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-4"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            Des tarifs simples et <span className="text-primary">transparents.</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Un forfait de mise en place unique. Un abonnement mensuel. Pas de mauvaise surprise.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-5xl mx-auto items-start">
          {plans.map((plan, i) => {
            const isActive = activeIndex === i;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onMouseEnter={() => setActiveIndex(i)}
                animate={{
                  scale: isActive ? (plan.popular ? 1.05 : 1.02) : 1,
                  y: isActive ? -4 : 0,
                }}
                className={`relative rounded-lg p-6 md:p-8 border-2 bg-background/80 dark:bg-card/80 backdrop-blur-sm cursor-pointer
                  ${isActive
                    ? "border-primary shadow-card-hover"
                    : "border-border shadow-card"
                  }`}
              >
                {/* Badge "Le plus populaire" */}
                {plan.popular && (
                  <motion.span
                    animate={{ opacity: isActive ? 1 : 0.4 }}
                    transition={{ duration: 0.2 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap"
                  >
                    Le plus populaire
                  </motion.span>
                )}
                {/* Badge Enterprise */}
                {plan.isEnterprise && (
                  <motion.span
                    animate={{ opacity: isActive ? 1 : 0.5 }}
                    transition={{ duration: 0.2 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap"
                  >
                    Sur devis
                  </motion.span>
                )}

                {/* Glow orange en fond sur la carte active */}
                <motion.div
                  animate={{ opacity: isActive ? 1 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 rounded-lg bg-primary/5 pointer-events-none"
                />

                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.limit}</p>

                {/* Prix */}
                {plan.isEnterprise ? (
                  <div className="mb-6">
                    <div className="text-3xl font-extrabold text-foreground mb-1">Sur devis</div>
                    <p className="text-xs text-muted-foreground">Contactez-nous pour un devis personnalisé</p>
                  </div>
                ) : (
                  <div className="mb-6">
                    {/* Badge promo */}
                    <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
                      <span>🎁</span>
                      <span>Promo {plan.promoDuration} : {plan.promoPrice}€/mois</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-extrabold">{plan.promoPrice}€</span>
                      <span className="text-muted-foreground text-sm mb-1">/mois</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-sm text-muted-foreground line-through">{plan.price}€/mois</span>
                      <span className="text-xs text-muted-foreground">puis</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sans engagement · Résiliable à tout moment
                    </p>
                  </div>
                )}

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 transition-colors duration-200 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.isEnterprise ? "#contact" : plan.stripeLink}
                  target={plan.isEnterprise ? undefined : "_blank"}
                  rel={plan.isEnterprise ? undefined : "noopener noreferrer"}
                  className={`flex items-center justify-center gap-2 w-full text-center rounded-btn py-3 text-sm font-semibold border-2 transition-all duration-200 ${
                    isActive
                      ? plan.isEnterprise
                        ? "bg-foreground text-background border-foreground"
                        : "bg-primary text-white border-primary"
                      : "bg-transparent text-primary border-primary hover:bg-primary/10"
                  }`}
                >
                  {plan.isEnterprise && <Mail className="w-4 h-4" />}
                  {plan.cta}
                </a>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-8"
        >
          <p className="text-sm text-muted-foreground">
            🔒 Sans engagement minimum · Données vous appartiennent · Garantie 3 mois incluse
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
