import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function CGV() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-10 transition-colors">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>

        <h1 className="text-3xl font-semibold mb-2">Conditions Générales de Vente</h1>
        <p className="text-sm text-muted-foreground mb-10">Dernière mise à jour : mai 2026</p>

        <div className="space-y-8 text-foreground/90 leading-relaxed text-sm">

          <section>
            <h2 className="text-lg font-medium mb-3">1. Objet</h2>
            <p>
              Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre StayPilot
              (ci-après «&nbsp;l'Éditeur&nbsp;») et toute personne physique ou morale souscrivant à un abonnement
              StayPilot (ci-après «&nbsp;le Client&nbsp;»).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">2. Description du service</h2>
            <p>
              StayPilot est une plateforme SaaS (Software as a Service) destinée aux conciergeries locatives. Elle inclut
              trois espaces distincts : l'Espace Admin, l'Espace Propriétaire et CleanPilot (application dédiée aux équipes
              de ménage), dont les fonctionnalités varient selon le plan souscrit.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">3. Plans et tarifs</h2>
            <p className="mb-3">Les plans disponibles sont :</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium">Plan</th>
                  <th className="text-left py-2 pr-4 font-medium">Prix mensuel TTC</th>
                  <th className="text-left py-2 font-medium">Logements inclus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr><td className="py-2 pr-4">Starter</td><td className="py-2 pr-4">59 €</td><td className="py-2">Jusqu'à 3</td></tr>
                <tr><td className="py-2 pr-4">Pro</td><td className="py-2 pr-4">99 €</td><td className="py-2">Jusqu'à 15</td></tr>
                <tr><td className="py-2 pr-4">Business</td><td className="py-2 pr-4">Sur devis</td><td className="py-2">Illimité</td></tr>
              </tbody>
            </table>
            <p className="mt-3 text-muted-foreground">
              Les tarifs sont exprimés TTC. L'Éditeur se réserve le droit de modifier les tarifs avec un préavis de 30 jours
              par email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">4. Modalités de paiement</h2>
            <p>
              Le paiement s'effectue par carte bancaire via la plateforme sécurisée Stripe. L'abonnement est prélevé
              mensuellement à la date anniversaire de souscription. En cas d'échec de prélèvement, l'accès au service peut
              être suspendu après un délai de 7 jours.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">5. Durée et résiliation</h2>
            <p>
              L'abonnement est souscrit sans engagement de durée minimale. Le Client peut résilier à tout moment depuis son
              espace Abonnement ou en envoyant un email à <a href="mailto:contact@staypilot.cc" className="text-primary underline">contact@staypilot.cc</a>.
              La résiliation prend effet à la fin de la période de facturation en cours. Aucun remboursement prorata n'est
              effectué pour une résiliation en cours de période.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">6. Droit de rétractation</h2>
            <p>
              Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux
              contrats de fourniture d'un contenu numérique dont l'exécution a commencé avec l'accord du consommateur.
              Cependant, StayPilot accorde une garantie de satisfaction de 30 jours : si le Client n'est pas satisfait dans
              les 30 premiers jours suivant la première souscription, il peut obtenir un remboursement intégral en contactant
              notre support.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">7. Disponibilité du service</h2>
            <p>
              L'Éditeur s'engage à maintenir le service accessible 24h/24 et 7j/7, sauf en cas de maintenance planifiée
              (annoncée 48h à l'avance) ou de force majeure. Aucune compensation ne sera due en cas d'indisponibilité
              inférieure à 4 heures consécutives par mois.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">8. Données personnelles</h2>
            <p>
              Le traitement des données personnelles est décrit dans notre{' '}
              <Link to="/confidentialite" className="text-primary underline">Politique de confidentialité</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">9. Responsabilité</h2>
            <p>
              L'Éditeur ne peut être tenu responsable des dommages indirects résultant de l'utilisation du service.
              La responsabilité de l'Éditeur est en tout état de cause limitée au montant des sommes versées par le
              Client au titre des 3 derniers mois précédant le fait générateur.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">10. Droit applicable et litiges</h2>
            <p>
              Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher
              une solution amiable avant tout recours judiciaire. À défaut, les tribunaux français seront seuls compétents.
              Le Client consommateur peut également recourir à la médiation via la plateforme européenne de règlement en
              ligne des litiges : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary underline">ec.europa.eu/consumers/odr</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">11. Contact</h2>
            <p>
              Pour toute question relative aux présentes CGV :{' '}
              <a href="mailto:contact@staypilot.cc" className="text-primary underline">contact@staypilot.cc</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
