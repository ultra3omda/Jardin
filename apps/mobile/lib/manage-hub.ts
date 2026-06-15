import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type ManageDomain =
  | 'scolarite'
  | 'pedagogie'
  | 'vieEcole'
  | 'finance'
  | 'rh'
  | 'communication'
  | 'parametres';

export interface ManageEntry {
  route: string;
  title: string;
  subtitle: string;
  icon: IoniconName;
  color: string;
  domain: ManageDomain;
}

export const DOMAIN_ORDER: ManageDomain[] = [
  'scolarite',
  'pedagogie',
  'vieEcole',
  'finance',
  'rh',
  'communication',
  'parametres',
];

export const DOMAIN_LABELS: Record<ManageDomain, string> = {
  scolarite: 'Scolarité',
  pedagogie: 'Pédagogie',
  vieEcole: 'Vie école',
  finance: 'Finance',
  rh: 'RH',
  communication: 'Communication',
  parametres: 'Paramètres',
};

export const MANAGE_ENTRIES: ManageEntry[] = [
  {
    route: '/(app)/manage/directory',
    title: 'Annuaire',
    subtitle: 'Enseignants, parents, personnel',
    icon: 'people-outline',
    color: '#3b82f6',
    domain: 'scolarite',
  },
  {
    route: '/(app)/manage/classes',
    title: 'Classes',
    subtitle: 'Créer une classe, affecter un enseignant',
    icon: 'school-outline',
    color: '#22c55e',
    domain: 'scolarite',
  },
  {
    route: '/(app)/manage/subjects',
    title: 'Matières',
    subtitle: 'Référentiel des matières',
    icon: 'book-outline',
    color: '#a78bfa',
    domain: 'scolarite',
  },
  {
    route: '/(app)/manage/observations',
    title: 'Observations',
    subtitle: 'Saisie rapide du fil pédagogique',
    icon: 'eye-outline',
    color: '#671bf0',
    domain: 'pedagogie',
  },
  {
    route: '/(app)/manage/canteen',
    title: 'Cantine',
    subtitle: 'Menus de la semaine',
    icon: 'restaurant-outline',
    color: '#f59e0b',
    domain: 'vieEcole',
  },
  {
    route: '/(app)/manage/activities',
    title: 'Activités',
    subtitle: 'Ateliers, sorties, éveil',
    icon: 'color-palette-outline',
    color: '#ec4899',
    domain: 'vieEcole',
  },
  {
    route: '/(app)/manage/discipline',
    title: 'Discipline',
    subtitle: 'Incidents & sanctions',
    icon: 'warning-outline',
    color: '#ef4444',
    domain: 'vieEcole',
  },
  {
    route: '/(app)/manage/transport',
    title: 'Transport',
    subtitle: 'Lignes de bus & chauffeurs',
    icon: 'bus-outline',
    color: '#f97316',
    domain: 'vieEcole',
  },
  {
    route: '/(app)/manage/health',
    title: 'Santé',
    subtitle: 'Dossiers médicaux (RGPD)',
    icon: 'medkit-outline',
    color: '#ef4444',
    domain: 'vieEcole',
  },
  {
    route: '/(app)/manage/security',
    title: 'Sécurité',
    subtitle: 'Incidents, visiteurs, exercices',
    icon: 'shield-checkmark-outline',
    color: '#0ea5e9',
    domain: 'vieEcole',
  },
  {
    route: '/(app)/manage/finance',
    title: 'Finances',
    subtitle: 'Factures & paiements',
    icon: 'card-outline',
    color: '#14b8a6',
    domain: 'finance',
  },
  {
    route: '/(app)/manage/caisse',
    title: 'Caisse',
    subtitle: 'Caisse du jour & clôture',
    icon: 'cash-outline',
    color: '#02a896',
    domain: 'finance',
  },
  {
    route: '/(app)/manage/unpaid',
    title: 'Impayés',
    subtitle: 'Échéances non réglées & relances',
    icon: 'alert-circle-outline',
    color: '#ef4444',
    domain: 'finance',
  },
  {
    route: '/(app)/manage/hr',
    title: 'RH — Contrats',
    subtitle: 'Contrats du personnel',
    icon: 'briefcase-outline',
    color: '#7c3aed',
    domain: 'rh',
  },
  {
    route: '/(app)/manage/appointments',
    title: 'Rendez-vous',
    subtitle: 'Demandes des parents, confirmation',
    icon: 'calendar-outline',
    color: '#02a896',
    domain: 'communication',
  },
  {
    route: '/(app)/manage/announcements',
    title: 'Annonces',
    subtitle: 'Communiquer avec parents & équipe',
    icon: 'megaphone-outline',
    color: '#0ea5e9',
    domain: 'communication',
  },
  {
    route: '/(app)/manage/settings',
    title: 'Réglages',
    subtitle: 'Établissement & couleurs',
    icon: 'settings-outline',
    color: '#64748b',
    domain: 'parametres',
  },
  {
    route: '/(app)/manage/imports',
    title: 'Imports',
    subtitle: 'Importer des données (CSV/Excel)',
    icon: 'cloud-upload-outline',
    color: '#0284c7',
    domain: 'parametres',
  },
];

export interface ManageGroup {
  domain: ManageDomain;
  label: string;
  entries: ManageEntry[];
}

/** Regroupe les entrées par domaine, dans l'ordre DOMAIN_ORDER, sans groupe vide. */
export function groupByDomain(entries: ManageEntry[]): ManageGroup[] {
  return DOMAIN_ORDER.map((domain) => ({
    domain,
    label: DOMAIN_LABELS[domain],
    entries: entries.filter((e) => e.domain === domain),
  })).filter((g) => g.entries.length > 0);
}
