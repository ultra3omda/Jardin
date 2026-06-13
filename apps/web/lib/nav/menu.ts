import type { LucideIcon } from 'lucide-react';

import type { AuthTenant, AuthUser } from '@/lib/auth/types';
import { ICONS } from './icons';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

type TenantType = 'KINDERGARTEN' | 'PRIMARY_SCHOOL' | 'MIXED';

interface BuildContext {
  user: AuthUser;
  tenant: AuthTenant | null;
  type: TenantType | null;
}

/**
 * V7 — Resolve the sidebar navigation for a given (user, tenant) pair.
 * - SUPER_ADMIN -> platform console (cross-tenant)
 * - SCHOOL_ADMIN / TEACHER / PARENT / STAFF -> adapted to tenant.type
 */
export function getNavForUser(user: AuthUser, tenant: AuthTenant | null): NavSection[] {
  if (user.role === 'SUPER_ADMIN') return platformNav();
  if (user.role === 'COMMERCIAL') return commercialNav();
  if (!tenant) return [];
  const type = tenant.type as TenantType;
  const ctx: BuildContext = { user, tenant, type };
  switch (user.role) {
    case 'SCHOOL_ADMIN': return schoolAdminNav(ctx);
    case 'TEACHER':      return teacherNav(ctx);
    case 'PARENT':       return parentNav(ctx);
    case 'STAFF':        return staffNav(ctx);
    default:             return [];
  }
}

function schoolAdminNav({ type }: BuildContext): NavSection[] {
  const isKG = type === 'KINDERGARTEN';

  const academicItems: NavItem[] = isKG
    ? [
        { id: 'journal',      label: 'Journal quotidien', href: '/journal',      icon: ICONS.journal },
        { id: 'activities',   label: 'Activités',         href: '/activities',   icon: ICONS.activities },
        { id: 'observations', label: 'Observations',      href: '/observations', icon: ICONS.observations },
        { id: 'absences',     label: 'Présences',         href: '/absences',     icon: ICONS.absences },
        { id: 'schedule',     label: 'Planning',          href: '/schedule',     icon: ICONS.schedule },
      ]
    : [
        { id: 'notes',        label: 'Notes',           href: '/notes',        icon: ICONS.notes },
        { id: 'bulletins',    label: 'Bulletins',       href: '/bulletins',    icon: ICONS.bulletins },
        { id: 'evaluations',  label: 'Évaluations',     href: '/evaluations',  icon: ICONS.evaluations },
        { id: 'homework',     label: 'Devoirs',         href: '/homework',     icon: ICONS.evaluations },
        { id: 'observations', label: 'Observations',    href: '/observations', icon: ICONS.observations },
        { id: 'absences',     label: 'Absences',        href: '/absences',     icon: ICONS.absences },
        { id: 'discipline',  label: 'Discipline',      href: '/discipline',  icon: ICONS.discipline },
        { id: 'schedule',    label: 'Emploi du temps', href: '/schedule',    icon: ICONS.schedule },
      ];

  return [
    {
      id: 'accueil',
      label: 'Accueil',
      items: [{ id: 'dashboard', label: 'Tableau de bord', href: '/dashboard', icon: ICONS.dashboard }],
    },
    {
      id: 'administration',
      label: 'Administration',
      items: [
        { id: 'establishment', label: 'Établissement',                    href: '/settings/establishment', icon: ICONS.establishment },
        { id: 'schoolYear',    label: 'Année scolaire',                   href: '/settings/grade-periods', icon: ICONS.schoolYear },
        { id: 'classes',       label: isKG ? "Groupes d'âge" : 'Classes', href: '/classes',                icon: ICONS.classes },
        { id: 'classPromotion', label: 'Passage de classe',               href: '/classes/promotion',      icon: ICONS.classPromotion },
      ],
    },
    {
      id: 'scolarite',
      label: 'Scolarité',
      items: [
        { id: 'students',    label: isKG ? 'Enfants' : 'Élèves',            href: '/students',     icon: ICONS.students },
        { id: 'enrollments', label: 'Inscriptions',                         href: '/enrollments',  icon: ICONS.enrollments },
        { id: 'teachers',    label: isKG ? 'Animateurs' : 'Enseignants',    href: '/teachers',     icon: ICONS.teachers },
        { id: 'parents',     label: 'Parents',                              href: '/parents',      icon: ICONS.parents },
      ],
    },
    { id: 'pedagogie', label: 'Pédagogie', items: academicItems },
    {
      id: 'vieEcole',
      label: 'Vie école',
      items: [
        { id: 'canteen',             label: 'Cantine',             href: '/canteen',              icon: ICONS.canteen },
        { id: 'canteenDishes',       label: 'Plats',               href: '/canteen/dishes',       icon: ICONS.canteenDishes },
        { id: 'canteenReservations', label: 'Réservations cantine', href: '/canteen/reservations', icon: ICONS.canteenReservations },
        { id: 'canteenStats',        label: 'Stats cantine',       href: '/canteen/stats',        icon: ICONS.canteenStats },
        { id: 'transport', label: 'Transport', href: '/transport', icon: ICONS.transport },
        { id: 'health',    label: 'Santé',     href: '/health',    icon: ICONS.health },
      ],
    },
    {
      id: 'communication',
      label: 'Communication',
      items: [
        { id: 'messages',      label: 'Messages',  href: '/messages',      icon: ICONS.messages },
        { id: 'announcements', label: 'Annonces',  href: '/announcements', icon: ICONS.announcements },
        { id: 'calendar',      label: 'Calendrier', href: '/calendar',     icon: ICONS.calendar },
        { id: 'appointments',  label: 'Rendez-vous', href: '/appointments', icon: ICONS.appointments },
      ],
    },
    {
      id: 'finance',
      label: 'Finance',
      items: [
        { id: 'billing',     label: 'Facturation',        href: '/billing',           icon: ICONS.billing },
        { id: 'feeTypes',    label: 'Référentiel de frais', href: '/frais/types',       icon: ICONS.feeTypes },
        { id: 'feeAssign',   label: 'Affectation de frais', href: '/frais/affectation', icon: ICONS.feeAssign },
        { id: 'feeUnpaid',   label: 'Impayés',            href: '/frais/impayes',     icon: ICONS.feeUnpaid },
        { id: 'cashRegister', label: 'Caisse',            href: '/caisse',            icon: ICONS.cashRegister },
        { id: 'cashClosures', label: 'Clôtures',          href: '/caisse/closures',   icon: ICONS.cashClosures },
        { id: 'expenses',    label: 'Dépenses',           href: '/depenses',          icon: ICONS.expenses },
        { id: 'suppliers',   label: 'Fournisseurs',       href: '/fournisseurs',      icon: ICONS.suppliers },
        { id: 'payments',    label: 'Paiements',          href: '/payments',          icon: ICONS.payments },
        { id: 'hrPayroll',   label: 'RH / Paie',          href: '/hr',                icon: ICONS.hrPayroll },
      ],
    },
    {
      id: 'parametres',
      label: 'Paramètres',
      items: [
        { id: 'subjects',     label: 'Matières',   href: '/settings/subjects',      icon: ICONS.subjects },
        { id: 'gradePeriods', label: 'Trimestres', href: '/settings/grade-periods', icon: ICONS.gradePeriods },
        { id: 'imports',      label: 'Importer',   href: '/imports',                icon: ICONS.imports },
      ],
    },
    {
      id: 'compte',
      label: 'Compte',
      items: [
        { id: 'profile',  label: 'Profil',    href: '/profile',           icon: ICONS.branding },
        { id: 'branding', label: 'Apparence', href: '/settings/branding', icon: ICONS.branding },
      ],
    },
  ];
}

function teacherNav({ type }: BuildContext): NavSection[] {
  const isKG = type === 'KINDERGARTEN';

  if (isKG) {
    return [
      { id: 'accueil', label: 'Accueil', items: [{ id: 'dashboard', label: 'Ma journée', href: '/dashboard', icon: ICONS.dashboard }] },
      { id: 'pedagogie', label: 'Vie quotidienne', items: [
        { id: 'journal',      label: 'Journal du jour', href: '/journal',      icon: ICONS.journal },
        { id: 'activities',   label: 'Activités',       href: '/activities',   icon: ICONS.activities },
        { id: 'observations', label: 'Observations',    href: '/observations', icon: ICONS.observations },
        { id: 'absences',     label: 'Présences',       href: '/absences',     icon: ICONS.absences },
        { id: 'schedule',     label: 'Mon planning',    href: '/schedule',     icon: ICONS.schedule },
      ]},
      { id: 'communication', label: 'Communication', items: [
        { id: 'messages',      label: 'Messages parents', href: '/messages',      icon: ICONS.messages },
        { id: 'announcements', label: 'Annonces',         href: '/announcements', icon: ICONS.announcements },
        { id: 'calendar',      label: 'Calendrier',       href: '/calendar',      icon: ICONS.calendar },
        { id: 'appointments',  label: 'Rendez-vous',      href: '/appointments',  icon: ICONS.appointments },
      ]},
      { id: 'compte', label: 'Compte', items: [{ id: 'profile', label: 'Profil', href: '/profile', icon: ICONS.branding }] },
    ];
  }

  return [
    { id: 'accueil', label: 'Accueil', items: [{ id: 'dashboard', label: 'Tableau de bord', href: '/dashboard', icon: ICONS.dashboard }] },
    { id: 'pedagogie', label: 'Pédagogie', items: [
      { id: 'notes',        label: 'Saisir notes',     href: '/notes',        icon: ICONS.notes },
      { id: 'evaluations',  label: 'Évaluations',      href: '/evaluations',  icon: ICONS.evaluations },
      { id: 'homework',     label: 'Devoirs',          href: '/homework',     icon: ICONS.evaluations },
      { id: 'observations', label: 'Observations',     href: '/observations', icon: ICONS.observations },
      { id: 'bulletins',    label: 'Bulletins',        href: '/bulletins',    icon: ICONS.bulletins },
      { id: 'absences',     label: 'Absences',         href: '/absences',     icon: ICONS.absences },
      { id: 'discipline',  label: 'Discipline',       href: '/discipline',  icon: ICONS.discipline },
      { id: 'schedule',    label: 'Mon EDT',          href: '/schedule',    icon: ICONS.schedule },
    ]},
    { id: 'communication', label: 'Communication', items: [
      { id: 'messages',      label: 'Messages', href: '/messages',      icon: ICONS.messages },
      { id: 'announcements', label: 'Annonces', href: '/announcements', icon: ICONS.announcements },
      { id: 'calendar',      label: 'Calendrier', href: '/calendar',   icon: ICONS.calendar },
      { id: 'appointments',  label: 'Rendez-vous', href: '/appointments', icon: ICONS.appointments },
    ]},
    { id: 'compte', label: 'Compte', items: [{ id: 'profile', label: 'Profil', href: '/profile', icon: ICONS.branding }] },
  ];
}

function parentNav({ type }: BuildContext): NavSection[] {
  const isKG = type === 'KINDERGARTEN';

  return [
    { id: 'mesEnfants', label: 'Mes enfants', items: [
      { id: 'dashboard', label: isKG ? 'Mon enfant' : 'Mes enfants', href: '/dashboard', icon: ICONS.dashboard },
    ]},
    { id: 'pedagogie', label: isKG ? 'Quotidien' : 'Scolarité', items: isKG ? [
      { id: 'journal',    label: 'Journal du jour', href: '/journal',    icon: ICONS.journal },
      { id: 'activities', label: 'Activités',       href: '/activities', icon: ICONS.activities },
      { id: 'absences',   label: 'Présences',       href: '/absences',   icon: ICONS.absences },
      { id: 'canteen',    label: 'Cantine',         href: '/canteen',    icon: ICONS.canteen },
    ] : [
      { id: 'bulletins', label: 'Notes & Bulletins', href: '/bulletins', icon: ICONS.bulletins },
      { id: 'absences',  label: 'Absences',          href: '/absences',  icon: ICONS.absences },
      { id: 'schedule',  label: 'EDT',               href: '/schedule',  icon: ICONS.schedule },
    ]},
    { id: 'communication', label: 'Communication', items: [
      { id: 'messages',      label: 'Messages', href: '/messages',      icon: ICONS.messages },
      { id: 'announcements', label: 'Annonces', href: '/announcements', icon: ICONS.announcements },
      { id: 'calendar',      label: 'Calendrier', href: '/calendar',   icon: ICONS.calendar },
    ]},
    { id: 'finance', label: 'Finance', items: [
      { id: 'payments', label: 'Mes factures', href: '/payments', icon: ICONS.payments },
    ]},
    { id: 'compte', label: 'Compte', items: [{ id: 'profile', label: 'Profil', href: '/profile', icon: ICONS.branding }] },
  ];
}

function staffNav(_: BuildContext): NavSection[] {
  return [
    { id: 'accueil', label: 'Accueil', items: [{ id: 'dashboard', label: 'Tableau opérations', href: '/dashboard', icon: ICONS.dashboard }] },
    { id: 'scolarite', label: 'Élèves', items: [
      { id: 'students', label: 'Annuaire', href: '/students', icon: ICONS.students },
    ]},
    { id: 'vieEcole', label: 'Vie école', items: [
      { id: 'canteen',             label: 'Cantine',             href: '/canteen',              icon: ICONS.canteen },
      { id: 'canteenDishes',       label: 'Plats',               href: '/canteen/dishes',       icon: ICONS.canteenDishes },
      { id: 'canteenReservations', label: 'Réservations cantine', href: '/canteen/reservations', icon: ICONS.canteenReservations },
      { id: 'canteenStats',        label: 'Stats cantine',       href: '/canteen/stats',        icon: ICONS.canteenStats },
      { id: 'transport', label: 'Transport',        href: '/transport', icon: ICONS.transport },
      { id: 'health',    label: 'Santé',            href: '/health',    icon: ICONS.health },
      { id: 'security',  label: 'Sécurité',         href: '/security',  icon: ICONS.security },
    ]},
    { id: 'pedagogie', label: 'Pédagogie', items: [
      { id: 'bulletins', label: 'Bulletins (lecture)', href: '/bulletins', icon: ICONS.bulletins },
    ]},
    { id: 'outils', label: 'Outils', items: [
      { id: 'imports', label: 'Importer', href: '/imports', icon: ICONS.imports },
    ]},
    { id: 'communication', label: 'Communication', items: [
      { id: 'messages',      label: 'Messages', href: '/messages',      icon: ICONS.messages },
      { id: 'announcements', label: 'Annonces', href: '/announcements', icon: ICONS.announcements },
      { id: 'calendar',      label: 'Calendrier', href: '/calendar',   icon: ICONS.calendar },
      { id: 'appointments',  label: 'Rendez-vous', href: '/appointments', icon: ICONS.appointments },
    ]},
    { id: 'compte', label: 'Compte', items: [{ id: 'profile', label: 'Profil', href: '/profile', icon: ICONS.branding }] },
  ];
}

/**
 * GTM — COMMERCIAL is a platform sub-admin: it only sees the commercial
 * back-office (sign contracts + create organizations). No access to any
 * tenant data nor to the Klasso platform console.
 */
function commercialNav(): NavSection[] {
  return [
    { id: 'commercial', label: 'Commercial', items: [
      { id: 'organizations', label: 'Mes organisations', href: '/commercial',     icon: ICONS.tenants },
      { id: 'newOrg',        label: 'Nouvelle org.',     href: '/commercial/new', icon: ICONS.enrollments },
    ]},
    { id: 'compte', label: 'Compte', items: [
      { id: 'profile', label: 'Profil', href: '/profile', icon: ICONS.branding },
    ]},
  ];
}

function platformNav(): NavSection[] {
  return [
    { id: 'plateforme', label: 'Plateforme', items: [
      { id: 'dashboard',     label: 'Tableau de bord', href: '/admin',          icon: ICONS.dashboard },
      { id: 'tenants',       label: 'Tenants',        href: '/admin/tenants',  icon: ICONS.tenants },
      { id: 'demoRequests',  label: 'Demandes démo',  href: '/admin/demo',     icon: ICONS.bell },
      { id: 'inviteTokens',  label: 'Invitations',    href: '/admin/invite-tokens', icon: ICONS.enrollments },
    ]},
    { id: 'commercial', label: 'Commercial', items: [
      { id: 'organizations', label: 'Organisations', href: '/commercial',        icon: ICONS.tenants },
      { id: 'newOrg',        label: 'Nouvelle org.', href: '/commercial/new',    icon: ICONS.enrollments },
      { id: 'agents',        label: 'Commerciaux',   href: '/commercial/agents', icon: ICONS.teachers },
    ]},
    { id: 'systeme', label: 'Système', items: [
      { id: 'audit',     label: 'Audit logs', href: '/admin/audit',     icon: ICONS.audit },
      { id: 'analytics', label: 'Analytics',  href: '/admin/analytics', icon: ICONS.audit },
    ]},
    { id: 'compte', label: 'Compte', items: [
      { id: 'profile', label: 'Profil', href: '/profile', icon: ICONS.branding },
    ]},
  ];
}
