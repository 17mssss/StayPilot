import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-10 transition-colors">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>

        <h1 className="text-3xl font-semibold mb-2">Mentions légales</h1>
        <p className="text-sm text-muted-foreground mb-10">Dernière mise à jour : mai 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground/90 leading-relaxed">

          <section>
            <h2 className="text-lg font-medium mb-3">1. Éditeur du site</h2>
            <p>Le site <strong>staypilot.cc</strong> est édité par :</p>
            <ul className="mt-2 space-y-1 list-none pl-0">
              <li><strong>Raison sociale :</strong> StayPilot SAS (en cours d'immatriculation)</li>
              <li><strong>Siège social :</strong> France</li>
              <li><strong>Email de contact :</strong> <a href="mailto:contact@staypilot.cc" className="text-primary underline">contact@staypilot.cc</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">2. Hébergement</h2>
            <p>Le site est hébergé par :</p>
            <ul className="mt-2 space-y-1 list-none pl-0">
              <li><strong>Frontend :</strong> Vercel Inc. — 340 Pine Street Suite 701, San Francisco, CA 94104, USA</li>
              <li><strong>Backend & base de données :</strong> Railway Corp. et Supabase Inc.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">3. Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments constituant ce site (textes, graphiques, logiciels, photographies, images, sons, plans, noms,
              logos, marques, créations et œuvres protégeables diverses) sont la propriété exclusive de StayPilot ou font l'objet
              d'une autorisation d'utilisation. Toute reproduction, représentation, diffusion ou rediffusion, en tout ou partie,
              du contenu de ce site sur quelque support ou par tout procédé que ce soit, de même que toute vente, revente,
              retransmission ou mise à disposition de tiers de quelque manière que ce soit sont interdites.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">4. Responsabilité</h2>
            <p>
              StayPilot s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur ce site. Toutefois,
              StayPilot ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à la disposition
              sur ce site. En conséquence, StayPilot décline toute responsabilité pour toute imprécision, inexactitude ou
              omission portant sur des informations disponibles sur ce site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">5. Liens hypertextes</h2>
            <p>
              Ce site peut contenir des liens vers d'autres sites. StayPilot n'est pas responsable du contenu de ces sites
              tiers ni des pratiques de confidentialité de ces sites.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">6. Droit applicable</h2>
            <p>
              Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux français
              seront compétents.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">7. Contact</h2>
            <p>
              Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter à l'adresse suivante :{' '}
              <a href="mailto:contact@staypilot.cc" className="text-primary underline">contact@staypilot.cc</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
