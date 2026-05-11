import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Est-ce que StayPilot remplace mon channel manager ?",
    a: "Non — StayPilot se connecte à votre channel manager existant (Smoobu, Guesty, etc.) ou peut en faire office. Vous gardez vos outils, on ajoute ce qui manque.",
  },
  {
    q: "Combien de temps prend la mise en place ?",
    a: "Entre 24h et 72h selon le nombre de biens et de plateformes. Notre équipe s'occupe de toute la configuration.",
  },
  {
    q: "Mes propriétaires doivent-ils installer quelque chose ?",
    a: "Non, l'Owner App est accessible depuis n'importe quel navigateur (mobile et desktop). Pas d'installation requise.",
  },
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui, avec un préavis de 3 mois. Vous récupérez l'export complet de vos données.",
  },
  {
    q: "Est-ce que StayPilot gère vraiment le risque de double réservation ?",
    a: "Oui. La synchronisation est architecturalement conçue pour être instantanée, avec un système de verrou qui traite les réservations en file d'attente. C'est la garantie la plus forte du marché.",
  },
];

const FAQ = () => (
  <section id="faq" className="py-10 md:py-16 bg-accent">
    <div className="container max-w-3xl">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-extrabold text-center mb-12"
      >
        Questions <span className="text-primary">fréquentes.</span>
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="bg-background rounded-lg px-6 border border-border"
            >
              <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </div>
  </section>
);

export default FAQ;
