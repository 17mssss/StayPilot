import { motion, useMotionValue, useMotionTemplate, useAnimationFrame } from "framer-motion";
import React, { useRef } from "react";

const stats = [
  { value: "90%", label: "des opérations automatisées" },
  { value: "0", label: "double réservation" },
  { value: "24/7", label: "support client automatique" },
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

const Hero = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

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
  <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-background" onMouseMove={handleMouseMove}>
    {/* Base grid - subtle */}
    <div className="absolute inset-0 opacity-25 dark:opacity-40 pointer-events-none">
      <GridPattern id="hero-grid-base" offsetX={gridOffsetX} offsetY={gridOffsetY} />
    </div>
    {/* Active grid - mouse reveal */}
    <motion.div className="absolute inset-0 opacity-70 dark:opacity-90 pointer-events-none" style={{ maskImage, WebkitMaskImage: maskImage }}>
      <GridPattern id="hero-grid-reveal" offsetX={gridOffsetX} offsetY={gridOffsetY} />
    </motion.div>
    {/* Fade edges — adaptatif light/dark via CSS variable */}
    <div
      className="pointer-events-none absolute inset-0"
      style={{ background: 'radial-gradient(ellipse at center, transparent 30%, hsl(var(--background)) 75%)' }}
    />

    <div className="container relative">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl"
      >
        <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary-light text-primary text-sm font-medium">
          Utilisé par les conciergeries qui scalent
        </span>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
          Votre conciergerie Airbnb,
          <br />
          en{" "}
          <span className="text-primary">pilote automatique.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 leading-relaxed">
          Synchronisation multi-plateformes, chatbot 24/7, facturation automatique, Owner App pour
          vos propriétaires. StayPilot automatise 90% de vos opérations — pour que vous vous
          concentriez sur ce qui compte vraiment.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <a
            href="#contact"
            className="inline-flex items-center justify-center rounded-btn bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02]"
          >
            Réserver un appel personnalisé
          </a>
          <a
            href="#pricing"
            className="inline-flex items-center justify-center rounded-btn border-2 border-primary px-7 py-3.5 text-base font-semibold text-primary hover:bg-primary-light transition-colors"
          >
            Voir les tarifs
          </a>
        </div>

        <div className="grid grid-cols-3 gap-6 max-w-lg">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.15 }}
            >
              <div className="text-3xl md:text-4xl font-extrabold text-primary">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
  );
};

export default Hero;
