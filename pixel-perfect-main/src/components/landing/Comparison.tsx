import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const rows = [
  {
    label: "Tout en un seul outil",
    others: false,
    staypilot: true,
  },
  {
    label: "Application dédiée aux propriétaires",
    others: false,
    staypilot: true,
  },
  {
    label: "Messagerie IA 24/7 (SMS + WhatsApp)",
    others: false,
    staypilot: true,
  },
  {
    label: "Facturation automatique mensuelle",
    others: false,
    staypilot: true,
  },
  {
    label: "Gestion du ménage intégrée",
    others: false,
    staypilot: true,
  },
  {
    label: "Vue revenus en temps réel",
    others: false,
    staypilot: true,
  },
  {
    label: "Prise en main en 5 minutes",
    others: false,
    staypilot: true,
  },
  {
    label: "Setup accompagné inclus",
    others: false,
    staypilot: true,
  },
];

const Comparison = () => (
  <section className="py-10 md:py-16 bg-[#FFFCF9] dark:bg-[#0f1117]">
    <div className="container max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
          Pourquoi les conciergeries{" "}
          <span className="text-primary">choisissent StayPilot.</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Les outils classiques couvrent une partie du travail. StayPilot automatise l'ensemble.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="rounded-xl overflow-hidden border border-border shadow-card"
      >
        {/* Header */}
        <div className="grid grid-cols-3 bg-muted/30">
          <div className="py-4 px-6 text-sm font-semibold text-muted-foreground">
            Fonctionnalité
          </div>
          <div className="py-4 px-6 text-sm font-semibold text-muted-foreground text-center border-l border-border">
            Solutions classiques
          </div>
          <div className="py-4 px-6 text-sm font-bold text-primary text-center border-l border-border bg-primary-light/40">
            StayPilot 🚀
          </div>
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <div
            key={i}
            className={`grid grid-cols-3 border-t border-border ${
              i % 2 === 0 ? "bg-background" : "bg-muted/10"
            }`}
          >
            <div className="py-3.5 px-6 text-sm text-foreground flex items-center">
              {row.label}
            </div>
            <div className="py-3.5 px-6 flex items-center justify-center border-l border-border">
              <div className="w-6 h-6 rounded-full bg-muted/40 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="py-3.5 px-6 flex items-center justify-center border-l border-border bg-primary-light/20">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>
        ))}

        {/* Footer CTA */}
        <div className="grid grid-cols-3 border-t border-border bg-muted/10">
          <div className="py-5 px-6" />
          <div className="py-5 px-6 text-center border-l border-border">
            <span className="text-sm text-muted-foreground italic">
              Plusieurs outils,<br />plusieurs factures
            </span>
          </div>
          <div className="py-5 px-6 text-center border-l border-border bg-primary-light/20">
            <a
              href="#pricing"
              className="inline-block bg-primary text-white text-sm font-semibold px-5 py-2 rounded-btn hover:bg-primary/90 transition-colors"
            >
              Voir les offres →
            </a>
          </div>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="text-center text-sm text-muted-foreground mt-6 italic"
      >
        "Entre la simplicité des outils basiques et la puissance des solutions complexes — StayPilot combine les deux."
      </motion.p>
    </div>
  </section>
);

export default Comparison;
