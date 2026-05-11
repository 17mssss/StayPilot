import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const before = [
  "3 calendriers à synchroniser manuellement",
  "Risque de double réservation à chaque instant",
  "Propriétaires qui appellent pour leurs chiffres",
  "Factures envoyées à la main, souvent en retard",
  "Missions de ménage coordonnées par SMS",
  "Vous êtes l'outil central — et vous êtes saturé",
];

const after = [
  "Tous les calendriers synchronisés en temps réel",
  "Zéro double réservation — garanti",
  "Owner App : les propriétaires voient tout en autonomie",
  "Factures envoyées automatiquement le 1er du mois",
  "Missions créées et assignées automatiquement",
  "Vous pilotez — StayPilot exécute",
];

const Problem = () => (
  <section className="py-10 md:py-16">
    <div className="container">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-extrabold text-center mb-12 max-w-3xl mx-auto"
      >
        Vous gérez votre conciergerie à l'ancienne.{" "}
        <span className="text-primary">Il est temps de changer.</span>
      </motion.h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Before */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="rounded-lg border-2 border-red-200 dark:border-red-900 bg-error-light p-6 md:p-8"
        >
          <h3 className="text-xl font-bold mb-6 text-foreground">Avant StayPilot</h3>
          <ul className="space-y-4">
            {before.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                <span className="text-foreground/80">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* After */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="rounded-lg border-2 border-green-200 dark:border-green-900 bg-success-light p-6 md:p-8"
        >
          <h3 className="text-xl font-bold mb-6 text-foreground">Avec StayPilot</h3>
          <ul className="space-y-4">
            {after.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span className="text-foreground/80">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  </section>
);

export default Problem;
