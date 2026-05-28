import type { LucideIcon } from 'lucide-react';
import {
  Camera, ClipboardList, CreditCard, GraduationCap, Megaphone, PlusCircle,
  Sparkles, Stethoscope, Users, Utensils, Bus, ShieldAlert, School,
  Mail, FileText, Calendar, BookOpen,
} from 'lucide-react';

import type { UserRole } from '@/lib/auth/types';

export type KpiVariant = 'blue' | 'green' | 'orange' | 'amber' | 'pink' | 'purple';
type TenantType = 'KINDERGARTEN' | 'PRIMARY_SCHOOL' | 'MIXED' | null;

export interface KpiConfig {
  label: string;
  variant: KpiVariant;
  icon: LucideIcon;
  selectorKey: string;
  sub?: string;
}

export interface ActionConfig {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface DashboardConfig {
  heading: string;
  subtitleKey: 'today' | 'classesCount' | 'childrenCount' | 'tenantsCount';
  kpis: KpiConfig[];
  actions: ActionConfig[];
  panels: Array<'absencesToday' | 'upcomingDeadlines' | 'latestNotes' | 'announcements' | 'journalToday' | 'incidents' | 'demoRequests'>;
}

export function getDashboardConfig(role: UserRole, tenantType: TenantType): DashboardConfig {
  if (role === 'SUPER_ADMIN') return SUPER_ADMIN_CONFIG;

  const isKG = tenantType === 'KINDERGARTEN';

  switch (role) {
    case 'SCHOOL_ADMIN': return isKG ? SCHOOL_ADMIN_KG : SCHOOL_ADMIN_PRIMARY;
    case 'TEACHER':      return isKG ? TEACHER_KG      : TEACHER_PRIMARY;
    case 'PARENT':       return isKG ? PARENT_KG       : PARENT_PRIMARY;
    case 'STAFF':        return STAFF_CONFIG;
    default:             return TEACHER_PRIMARY;
  }
}

const SCHOOL_ADMIN_PRIMARY: DashboardConfig = {
  heading: 'Tableau de Bord',
  subtitleKey: 'today',
  kpis: [
    { label: 'Total Élèves',        variant: 'blue',   icon: Users,        selectorKey: 'studentsCount' },
    { label: 'Taux de Présence',    variant: 'green',  icon: ClipboardList, selectorKey: 'attendanceRate', sub: '%' },
    { label: 'Paiements en Retard', variant: 'orange', icon: CreditCard,   selectorKey: 'overduePayments', sub: 'paiements en attente' },
    { label: 'Moyenne Générale',    variant: 'amber',  icon: GraduationCap, selectorKey: 'globalAverage',  sub: 'Sur {classesCount} classes' },
  ],
  actions: [
    { label: 'Saisir les absences', href: '/absences',      icon: ClipboardList },
    { label: 'Voir les paiements',  href: '/payments',      icon: CreditCard },
    { label: 'Ajouter un élève',    href: '/students',      icon: PlusCircle },
    { label: 'Créer une annonce',   href: '/announcements', icon: Megaphone },
  ],
  panels: ['absencesToday', 'upcomingDeadlines', 'latestNotes', 'announcements'],
};

const SCHOOL_ADMIN_KG: DashboardConfig = {
  heading: 'Tableau de Bord',
  subtitleKey: 'today',
  kpis: [
    { label: 'Total Enfants',  variant: 'pink',  icon: Users,    selectorKey: 'childrenCount' },
    { label: 'Présents',       variant: 'green', icon: ClipboardList, selectorKey: 'presentToday' },
    { label: 'Photos du jour', variant: 'amber', icon: Camera,   selectorKey: 'photosToday' },
  ],
  actions: [
    { label: 'Photo du jour', href: '/journal',      icon: Camera },
    { label: 'Activité',      href: '/activities',   icon: Sparkles },
    { label: 'Pointage',      href: '/absences',     icon: ClipboardList },
    { label: 'Annonce',       href: '/announcements', icon: Megaphone },
  ],
  panels: ['journalToday', 'announcements'],
};

const TEACHER_PRIMARY: DashboardConfig = {
  heading: 'Bonjour, {firstName}.',
  subtitleKey: 'classesCount',
  kpis: [
    { label: 'Mes élèves',          variant: 'blue',   icon: Users,    selectorKey: 'myStudentsCount' },
    { label: 'Évals à corriger',    variant: 'orange', icon: BookOpen, selectorKey: 'evalsToGrade' },
    { label: 'Cours aujourd\'hui',  variant: 'green',  icon: Calendar, selectorKey: 'todayLessons' },
  ],
  actions: [
    { label: 'Évaluations',    href: '/evaluations', icon: PlusCircle },
    { label: 'Pointer',        href: '/absences',    icon: ClipboardList },
    { label: 'Message parent', href: '/messages',    icon: Mail },
    { label: 'Bulletins',      href: '/bulletins',   icon: FileText },
  ],
  panels: ['latestNotes', 'announcements'],
};

const TEACHER_KG: DashboardConfig = {
  heading: 'Bonjour, {firstName}.',
  subtitleKey: 'classesCount',
  kpis: [
    { label: 'Mes enfants',   variant: 'pink',  icon: Users,  selectorKey: 'myStudentsCount' },
    { label: 'Photos du jour', variant: 'amber', icon: Camera, selectorKey: 'photosToday' },
    { label: 'Présents',       variant: 'green', icon: ClipboardList, selectorKey: 'presentToday' },
  ],
  actions: [
    { label: 'Photo',          href: '/journal',    icon: Camera },
    { label: 'Activité',       href: '/activities', icon: Sparkles },
    { label: 'Pointage',       href: '/absences',   icon: ClipboardList },
    { label: 'Message parent', href: '/messages',   icon: Mail },
  ],
  panels: ['journalToday', 'announcements'],
};

const PARENT_PRIMARY: DashboardConfig = {
  heading: 'Bonjour, {firstName}.',
  subtitleKey: 'childrenCount',
  kpis: [
    { label: 'Mes enfants',  variant: 'pink',   icon: Users,       selectorKey: 'childrenCount' },
    { label: 'Nouv. notes',  variant: 'amber',  icon: BookOpen,    selectorKey: 'newGrades' },
    { label: 'Solde à payer', variant: 'orange', icon: CreditCard, selectorKey: 'amountDue', sub: 'TND' },
  ],
  actions: [
    { label: 'Bulletins',   href: '/bulletins',  icon: FileText },
    { label: 'Payer',       href: '/payments',   icon: CreditCard },
    { label: 'Messages',    href: '/messages',   icon: Mail },
    { label: 'EDT',         href: '/schedule',   icon: Calendar },
  ],
  panels: ['latestNotes', 'announcements'],
};

const PARENT_KG: DashboardConfig = {
  heading: '{childFirstName} aujourd\'hui',
  subtitleKey: 'today',
  kpis: [
    { label: 'Photos du jour', variant: 'pink',  icon: Camera,   selectorKey: 'photosToday' },
    { label: 'Activités',      variant: 'green', icon: Sparkles, selectorKey: 'activitiesToday' },
    { label: 'Présence',       variant: 'amber', icon: ClipboardList, selectorKey: 'presenceToday' },
  ],
  actions: [
    { label: 'Voir photos',         href: '/journal',  icon: Camera },
    { label: 'Journal',             href: '/journal',  icon: BookOpen },
    { label: 'Message animatrice',  href: '/messages', icon: Mail },
    { label: 'Payer',               href: '/payments', icon: CreditCard },
  ],
  panels: ['journalToday', 'announcements'],
};

const STAFF_CONFIG: DashboardConfig = {
  heading: 'Bonjour, {firstName}.',
  subtitleKey: 'today',
  kpis: [
    { label: 'Cantine auj.', variant: 'blue',   icon: Utensils,    selectorKey: 'canteenToday' },
    { label: 'Bus',          variant: 'orange', icon: Bus,         selectorKey: 'busesActive' },
    { label: 'Infirmerie',   variant: 'green',  icon: Stethoscope, selectorKey: 'infirmaryToday' },
  ],
  actions: [
    { label: 'Repas du jour', href: '/canteen',   icon: Utensils },
    { label: 'Trajets',       href: '/transport', icon: Bus },
    { label: 'Soin',          href: '/health',    icon: Stethoscope },
    { label: 'Incident',      href: '/security',  icon: ShieldAlert },
  ],
  panels: ['incidents', 'announcements'],
};

const SUPER_ADMIN_CONFIG: DashboardConfig = {
  heading: 'Plateforme Klasso',
  subtitleKey: 'tenantsCount',
  kpis: [
    { label: 'Écoles',         variant: 'purple', icon: School,   selectorKey: 'tenantsCount' },
    { label: 'Utilisateurs',   variant: 'blue',   icon: Users,    selectorKey: 'usersCount' },
    { label: 'Démos',          variant: 'orange', icon: Megaphone, selectorKey: 'pendingDemos' },
  ],
  actions: [
    { label: 'Tenants',    href: '/admin/tenants',       icon: PlusCircle },
    { label: 'Invitations', href: '/admin/invite-tokens', icon: Mail },
    { label: 'Analytics',  href: '/admin/analytics',     icon: BookOpen },
    { label: 'Audit',      href: '/admin/audit',         icon: ShieldAlert },
  ],
  panels: ['demoRequests', 'incidents'],
};
