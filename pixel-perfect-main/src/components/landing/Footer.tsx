import { Link } from 'react-router-dom'

const anchorLinks = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Tarifs", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const legalLinks = [
  { label: "Mentions légales", to: "/mentions-legales" },
  { label: "CGV", to: "/cgv" },
  { label: "Confidentialité", to: "/confidentialite" },
];

const Footer = () => (
  <footer className="py-10 border-t border-border">
    <div className="container flex flex-col gap-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <img src="/logo.png" alt="StayPilot" className="h-8 w-auto" loading="lazy" />
        <nav className="flex flex-wrap items-center gap-6">
          {anchorLinks.map((l) => (
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
          © 2026 StayPilot · contact@staypilot.cc
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-5 border-t border-border/50 pt-5">
        {legalLinks.map((l) => (
          <Link
            key={l.label}
            to={l.to}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  </footer>
);

export default Footer;
