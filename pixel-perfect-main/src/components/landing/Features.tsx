import { motion } from "framer-motion";
import { RefreshCw, MessageCircle, LayoutDashboard, Receipt, TrendingUp, Sparkles } from "lucide-react";

const features = [
  {
    icon: RefreshCw,
    title: "Synchronisation multi-plateformes",
    desc: "Airbnb, Booking.com, Abritel synchronisés en temps réel. Une réservation confirme ? Toutes les autres plateformes sont bloquées instantanément.",
  },
  {
    icon: MessageCircle,
    title: "Chatbot multilingue 24/7",
    desc: "Messages automatiques à chaque étape du séjour. Confirmation, check-in, check-out, demande d'avis. En français, anglais, espagnol et plus.",
  },
  {
    icon: LayoutDashboard,
    title: "Owner App — Application propriétaire",
    desc: "Vos propriétaires ont leur propre espace : calendrier temps réel, revenus détaillés, documents, contrats. Ils ne vous appellent plus.",
  },
  {
    icon: Receipt,
    title: "Facturation automatique",
    desc: "Synthèses mensuelles et factures générées et envoyées automatiquement le 1er du mois — aux propriétaires ET aux locataires.",
  },
  {
    icon: TrendingUp,
    title: "Pricing dynamique",
    desc: "Vos prix s'ajustent automatiquement selon la demande et la saisonnalité. +15 à +25% de revenus en moyenne.",
  },
  {
    icon: Sparkles,
    title: "Gestion du ménage",
    desc: "Chaque check-out génère une mission, l'assigne à votre équipe et envoie une notification. Check-list validée en app.",
  },
];

const Features = () => (
  <section id="features" className="py-10 md:py-16 bg-accent">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
          Tout ce dont vous avez besoin.{" "}
          <span className="text-primary">Rien de superflu.</span>
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-background rounded-lg p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center mb-4">
              <f.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">{f.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
