import { motion } from "framer-motion";

const platforms = ["Airbnb", "Booking.com", "Abritel", "Expedia", "PriceLabs", "Smoobu"];

const LogoBar = () => (
  <section className="py-12 bg-surface-alt">
    <div className="container text-center">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-sm text-muted-foreground italic mb-8"
      >
        Connecté à vos plateformes préférées
      </motion.p>
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
        {platforms.map((name, i) => (
          <motion.span
            key={name}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="text-lg font-semibold text-muted-foreground/50"
          >
            {name}
          </motion.span>
        ))}
      </div>
    </div>
  </section>
);

export default LogoBar;
