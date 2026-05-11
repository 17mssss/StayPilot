const links = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Tarifs", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
  { label: "Mentions légales", href: "#" },
];

const Footer = () => (
  <footer className="py-8 border-t border-border">
    <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
      <img src="/logo.png" alt="StayPilot" className="h-8 w-auto" loading="lazy" />
      <nav className="flex flex-wrap items-center gap-6">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {l.label}
          </a>
        ))}
      </nav>
      <p className="text-xs text-muted-foreground">
        © 2026 StayPilot · noreply@staypilot.cc
      </p>
    </div>
  </footer>
);

export default Footer;
