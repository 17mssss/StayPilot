import { motion } from "framer-motion";

const steps = [
  {
    num: "1",
    title: "On connecte vos plateformes",
    desc: "Airbnb, Booking.com, Abritel, votre channel manager actuel. La migration prend moins d'une journée.",
  },
  {
    num: "2",
    title: "On configure vos automatisations",
    desc: "Messages, pricing, ménage, facturation — tout est paramétré selon votre fonctionnement.",
  },
  {
    num: "3",
    title: "Vous pilotez, on gère",
    desc: "Votre dashboard en temps réel. Vos propriétaires sur leur app. Vous reprenez votre temps.",
  },
];

const HowItWorks = () => (
  <section className="py-10 md:py-16">
    <div className="container">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-extrabold text-center mb-12"
      >
        Opérationnel en <span className="text-primary">3 étapes.</span>
      </motion.h2>

      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="text-center"
          >
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-4">
              {s.num}
            </div>
            <h3 className="text-lg font-bold mb-2">{s.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
