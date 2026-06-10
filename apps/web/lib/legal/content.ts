/**
 * Legal documents (Klasso) — FR source of truth.
 *
 * ⚠️ TEMPLATES À FAIRE VALIDER PAR UN JURISTE avant tout usage commercial.
 * Les passages `[À COMPLÉTER : …]` doivent être remplis avec les informations
 * réelles de l'entité exploitante (raison sociale, adresse, matricule fiscal,
 * DPO, etc.). Rédigés pour le marché tunisien (loi organique n°2004-63 sur la
 * protection des données personnelles + INPDP) et alignés RGPD (UE) pour les
 * prospects/clients européens.
 *
 * La version française fait foi. Les pages portent un préfixe de locale dans
 * l'URL mais le contenu juridique reste en français (langue officielle du
 * contrat de service).
 */

export interface LegalSection {
  heading: string;
  /** Paragraphs (rendered as <p>). Use a leading "- " for list items. */
  body: string[];
}

export interface LegalDoc {
  slug: 'privacy' | 'terms' | 'legal-notice' | 'cookies';
  title: string;
  /** ISO date of last revision. */
  updatedAt: string;
  intro: string[];
  sections: LegalSection[];
}

const LAST_UPDATED = '2026-06-10';

/** Marker reused across docs for the operating entity's identity. */
const ENTITY = '[À COMPLÉTER : raison sociale]';
const ENTITY_FORM = '[À COMPLÉTER : forme juridique]';
const ENTITY_ADDRESS = '[À COMPLÉTER : adresse du siège]';
const ENTITY_RNE = '[À COMPLÉTER : matricule fiscal / RNE]';
const ENTITY_CAPITAL = '[À COMPLÉTER : capital social]';
const CONTACT_EMAIL = 'support@klasso.tn';
const DPO_EMAIL = '[À COMPLÉTER : email du délégué à la protection des données, ex. dpo@klasso.tn]';

export const LEGAL_NOTICE: LegalDoc = {
  slug: 'legal-notice',
  title: 'Mentions légales',
  updatedAt: LAST_UPDATED,
  intro: [
    "Le présent site et le service Klasso sont édités par l'entité ci-dessous. Conformément à la réglementation applicable, les informations suivantes sont portées à la connaissance des utilisateurs.",
  ],
  sections: [
    {
      heading: 'Éditeur',
      body: [
        `Dénomination : ${ENTITY} (${ENTITY_FORM}).`,
        `Siège social : ${ENTITY_ADDRESS}.`,
        `Matricule fiscal / RNE : ${ENTITY_RNE}.`,
        `Capital social : ${ENTITY_CAPITAL}.`,
        `Contact : ${CONTACT_EMAIL}.`,
        'Représentant légal : [À COMPLÉTER : nom du représentant légal].',
      ],
    },
    {
      heading: 'Hébergement',
      body: [
        "Application web : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.",
        "API et base de données : [À COMPLÉTER : Railway / Neon — régions]. Les données sont hébergées dans l'Union européenne ou dans un pays offrant un niveau de protection adéquat, sauf indication contraire dans la politique de confidentialité.",
        'Stockage de fichiers : Cloudflare R2.',
      ],
    },
    {
      heading: 'Propriété intellectuelle',
      body: [
        "L'ensemble des éléments du service (marque « Klasso », logos, interfaces, code, contenus éditoriaux) est protégé par le droit de la propriété intellectuelle et demeure la propriété exclusive de l'éditeur ou de ses concédants. Toute reproduction ou représentation non autorisée est interdite.",
      ],
    },
    {
      heading: 'Responsabilité',
      body: [
        "L'éditeur s'efforce d'assurer l'exactitude des informations diffusées et la disponibilité du service, sans toutefois garantir l'absence totale d'erreurs ou d'interruptions. Les conditions de responsabilité applicables au service souscrit sont précisées dans les Conditions Générales d'Utilisation et de Vente.",
      ],
    },
    {
      heading: 'Contact',
      body: [`Pour toute question : ${CONTACT_EMAIL}.`],
    },
  ],
};

export const PRIVACY: LegalDoc = {
  slug: 'privacy',
  title: 'Politique de confidentialité',
  updatedAt: LAST_UPDATED,
  intro: [
    `La présente politique décrit comment ${ENTITY} (« nous »), en sa qualité de responsable de traitement pour son propre site et de sous-traitant pour le compte des établissements scolaires clients, collecte et traite les données à caractère personnel dans le cadre du service Klasso.`,
    "Klasso traite des données relatives à des enfants et, le cas échéant, des données de santé. Ces données bénéficient d'une protection renforcée. Nous y apportons un soin particulier (voir §5 et §6).",
  ],
  sections: [
    {
      heading: '1. Rôles : responsable de traitement et sous-traitant',
      body: [
        "Pour les données des visiteurs du site public et des prospects (formulaire de démonstration), nous agissons en qualité de responsable de traitement.",
        "Pour les données saisies dans la plateforme par un établissement scolaire (élèves, parents, personnel), l'établissement est responsable de traitement et Klasso agit en qualité de sous-traitant, conformément à l'accord de traitement des données (DPA) annexé au contrat.",
      ],
    },
    {
      heading: '2. Données collectées',
      body: [
        '- Identité et contact : nom, prénom, email, téléphone, adresse.',
        '- Données scolaires : classe, inscriptions, notes, évaluations, bulletins, présences, devoirs.',
        "- Données familiales : lien parent-élève, coordonnées des responsables légaux.",
        "- Données de santé (facultatives, renseignées par l'établissement) : allergies, traitements, visites à l'infirmerie, vaccinations — traitées comme données sensibles.",
        "- Données de facturation : abonnement, transactions de paiement (via le prestataire ClicToPay ; nous ne stockons pas les numéros de carte).",
        "- Données techniques : journaux de connexion, adresse IP, identifiants de session, données de navigation strictement nécessaires (voir la politique cookies).",
      ],
    },
    {
      heading: '3. Finalités et bases légales',
      body: [
        "- Fourniture du service de gestion scolaire (exécution du contrat).",
        "- Gestion des comptes, authentification et sécurité (intérêt légitime et obligation légale).",
        "- Facturation et abonnements (exécution du contrat, obligations comptables).",
        "- Communication relative au service et support (exécution du contrat).",
        "- Traitement des demandes de démonstration (consentement / mesures précontractuelles).",
        "- Les données de santé ne sont traitées que sur la base définie par l'établissement responsable (ex. intérêt vital, mission d'intérêt public scolaire) et avec les garanties appropriées.",
      ],
    },
    {
      heading: '4. Destinataires et sous-traitants ultérieurs',
      body: [
        "Les données ne sont accessibles qu'aux personnels habilités de l'établissement concerné (isolation stricte par établissement) et, pour les besoins techniques, aux sous-traitants suivants : Vercel (hébergement web), [À COMPLÉTER : Railway/Neon] (API et base de données), Cloudflare R2 (stockage de fichiers), Resend (emails transactionnels), ClicToPay (paiements), [À COMPLÉTER : fournisseur SMS], Sentry (supervision des erreurs).",
        "Aucune donnée n'est vendue. Aucun transfert n'est réalisé à des fins publicitaires.",
      ],
    },
    {
      heading: '5. Protection des données des mineurs',
      body: [
        "Klasso est destiné à la gestion d'établissements accueillant des mineurs. Les comptes sont créés et administrés par l'établissement et les responsables légaux ; aucun mineur ne crée de compte de sa propre initiative.",
        "L'accès aux données d'un élève est strictement limité aux personnels habilités de son établissement et à ses responsables légaux.",
      ],
    },
    {
      heading: '6. Sécurité',
      body: [
        "- Isolation multi-établissement vérifiée automatiquement (un établissement ne peut jamais accéder aux données d'un autre).",
        "- Mots de passe chiffrés (bcrypt), jetons de session rotatifs et révocables, chiffrement en transit (HTTPS).",
        "- Limitation des accès au strict nécessaire, journalisation des actions sensibles, absence de données personnelles dans les journaux applicatifs.",
      ],
    },
    {
      heading: '7. Durée de conservation',
      body: [
        "Les données sont conservées pour la durée de la relation contractuelle puis archivées ou supprimées conformément aux obligations légales (ex. conservation comptable). [À COMPLÉTER : durées précises par catégorie de données].",
      ],
    },
    {
      heading: '8. Vos droits',
      body: [
        "Conformément à la loi organique n°2004-63 (Tunisie) et au RGPD (UE) le cas échéant, vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité.",
        `Pour les données saisies par un établissement, adressez votre demande à l'établissement (responsable de traitement). Pour les autres traitements, contactez ${DPO_EMAIL} ou ${CONTACT_EMAIL}.`,
        "La plateforme permet l'export et la suppression des données d'un utilisateur depuis l'espace profil.",
        "Vous pouvez introduire une réclamation auprès de l'Instance Nationale de Protection des Données Personnelles (INPDP, Tunisie) ou de l'autorité de contrôle compétente.",
      ],
    },
    {
      heading: '9. Modifications',
      body: [
        "La présente politique peut être mise à jour. La date de dernière révision figure en tête de page. Les modifications substantielles seront notifiées aux établissements clients.",
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  slug: 'terms',
  title: "Conditions Générales d'Utilisation et de Vente (CGU/CGV)",
  updatedAt: LAST_UPDATED,
  intro: [
    `Les présentes conditions régissent l'accès et l'utilisation du service Klasso édité par ${ENTITY}. Toute souscription emporte acceptation pleine et entière des présentes.`,
  ],
  sections: [
    {
      heading: '1. Objet',
      body: [
        "Klasso est une plateforme SaaS de gestion scolaire (élèves, parents, enseignants, pédagogie, communication, finances) proposée par abonnement aux établissements.",
      ],
    },
    {
      heading: '2. Souscription et compte',
      body: [
        "L'accès est réservé aux établissements ayant souscrit un abonnement. L'administrateur de l'établissement est responsable de la confidentialité des identifiants et des habilitations qu'il attribue.",
      ],
    },
    {
      heading: '3. Tarifs et facturation',
      body: [
        "Les tarifs sont exprimés en dinars tunisiens (TND), hors taxes, et facturés par élève selon le palier choisi : Starter 7, Standard 6, Pro 5 TND par élève et par mois ; ou en facturation annuelle 59, 49, 39 TND par élève et par an.",
        "Le montant à chaque échéance est calculé sur la base de l'effectif d'élèves actifs de l'établissement.",
        "Une période d'essai de 30 jours sans carte bancaire est proposée. Les paiements sont traités par le prestataire ClicToPay. [À COMPLÉTER : modalités de TVA, conditions de remboursement et de résiliation].",
      ],
    },
    {
      heading: '4. Disponibilité et support',
      body: [
        "Nous nous efforçons d'assurer une disponibilité élevée du service. Les engagements de niveau de service (SLA) éventuels sont précisés dans l'offre souscrite. Le support est accessible à " + CONTACT_EMAIL + '.',
      ],
    },
    {
      heading: '5. Obligations du client',
      body: [
        "Le client s'engage à un usage licite du service, à n'y déposer que des données dont il est en droit de disposer, et à respecter la réglementation applicable à la protection des données des personnes concernées (notamment les mineurs).",
      ],
    },
    {
      heading: '6. Protection des données',
      body: [
        "Le traitement des données personnelles est régi par la politique de confidentialité et l'accord de traitement des données (DPA). Klasso agit en qualité de sous-traitant pour les données saisies par l'établissement.",
      ],
    },
    {
      heading: '7. Propriété et réversibilité',
      body: [
        "Les données saisies par l'établissement lui appartiennent. À la fin du contrat, l'établissement peut exporter ses données ; elles sont ensuite supprimées dans un délai raisonnable. [À COMPLÉTER : délai de réversibilité et format d'export].",
      ],
    },
    {
      heading: '8. Responsabilité',
      body: [
        "La responsabilité de l'éditeur est limitée dans les conditions prévues par l'offre souscrite et la loi applicable. [À COMPLÉTER : plafond de responsabilité].",
      ],
    },
    {
      heading: '9. Résiliation',
      body: [
        "Les conditions de résiliation et de préavis sont précisées dans l'offre souscrite. [À COMPLÉTER : modalités de résiliation].",
      ],
    },
    {
      heading: '10. Droit applicable',
      body: [
        "Les présentes sont régies par le droit tunisien. [À COMPLÉTER : juridiction compétente].",
      ],
    },
  ],
};

export const COOKIES: LegalDoc = {
  slug: 'cookies',
  title: 'Politique relative aux cookies',
  updatedAt: LAST_UPDATED,
  intro: [
    "Cette page explique l'usage des cookies et traceurs sur le site et l'application Klasso.",
  ],
  sections: [
    {
      heading: '1. Qu’est-ce qu’un cookie ?',
      body: [
        "Un cookie est un petit fichier déposé sur votre terminal lors de la visite d'un site. Il permet, selon sa finalité, d'assurer le fonctionnement du service ou de mesurer son audience.",
      ],
    },
    {
      heading: '2. Cookies strictement nécessaires',
      body: [
        "Klasso utilise des cookies indispensables au fonctionnement : authentification et maintien de session (jeton de rafraîchissement sécurisé), préférence de langue, sécurité. Ces cookies ne requièrent pas de consentement car ils sont nécessaires à la fourniture du service que vous demandez.",
      ],
    },
    {
      heading: '3. Mesure d’audience et autres traceurs',
      body: [
        "À ce jour, Klasso n'utilise pas de cookies publicitaires. [À COMPLÉTER : si un outil de mesure d'audience (ex. PostHog) est activé, préciser sa finalité, sa durée et le recueil du consentement préalable].",
      ],
    },
    {
      heading: '4. Gestion de votre consentement',
      body: [
        "Un bandeau vous informe lors de votre première visite. Vous pouvez à tout moment modifier vos préférences via les réglages de votre navigateur. Le refus des cookies non essentiels n'empêche pas l'accès au service.",
      ],
    },
    {
      heading: '5. Contact',
      body: [`Pour toute question relative aux cookies : ${CONTACT_EMAIL}.`],
    },
  ],
};

export const LEGAL_DOCS: Record<LegalDoc['slug'], LegalDoc> = {
  privacy: PRIVACY,
  terms: TERMS,
  'legal-notice': LEGAL_NOTICE,
  cookies: COOKIES,
};
