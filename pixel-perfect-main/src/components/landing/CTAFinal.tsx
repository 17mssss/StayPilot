import { motion, useMotionValue, useMotionTemplate, useAnimationFrame } from "framer-motion";
import { useState } from "react";
import React from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://staypilot-backend-production.up.railway.app";

const BG = "#0f1117";

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

const CTAFinal = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setSent(true);
    } catch {
      setError("Une erreur s'est produite. Écris-nous directement à noreply@staypilot.cc");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="contact"
      className="relative py-10 md:py-16 overflow-hidden"
      style={{ backgroundColor: BG }}
      onMouseMove={handleMouseMove}
    >
      {/* Grille de fond */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <GridPattern id="cta-grid-base" offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>
      {/* Grille révélée au survol */}
      <motion.div
        className="absolute inset-0 opacity-80 pointer-events-none"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern id="cta-grid-reveal" offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </motion.div>
      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse at center, transparent 30%, ${BG} 75%)` }}
      />

      <div className="container relative max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Prêt à mettre votre conciergerie en pilote automatique ?
          </h2>
          <p className="text-white/60 max-w-lg mx-auto mb-8">
            Démo de 20 minutes · Sans engagement · Réponse sous 24h
          </p>

          {sent ? (
            <div className="bg-white/10 rounded-lg p-8 text-white">
              <p className="text-xl font-semibold mb-2">✅ Demande envoyée !</p>
              <p className="text-white/60">On vous répond dans les 24h.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jean Dupont"
                    className="w-full rounded-lg px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jean@maconciergerie.fr"
                    className="w-full rounded-lg px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+33 6 00 00 00 00"
                  className="w-full rounded-lg px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Nombre de biens gérés</label>
                <input
                  type="text"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Ex : 8 appartements sur Airbnb et Booking"
                  className="w-full rounded-lg px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-primary"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-btn bg-primary px-10 py-4 text-lg font-semibold text-white hover:bg-primary/90 transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Envoi en cours…" : "Demander une démo gratuite →"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default CTAFinal;
