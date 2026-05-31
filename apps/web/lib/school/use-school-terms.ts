'use client';

import { useMemo } from 'react';

import { useAuthStore } from '@/lib/auth/use-auth-store';

/**
 * Vocabulaire adapté au type d'établissement.
 * Maternelle (KINDERGARTEN) → enfants / groupes d'âge / animateurs.
 * École primaire → élèves / classes / enseignants.
 * La navigation et le dashboard sont déjà adaptés au type ; ce hook aligne le
 * vocabulaire des en-têtes/pages métier.
 */
export interface SchoolTerms {
  isKindergarten: boolean;
  students: string;
  student: string;
  classes: string;
  class: string;
  teachers: string;
  teacher: string;
  level: string;
}

const PRIMARY: Omit<SchoolTerms, 'isKindergarten'> = {
  students: 'Élèves',
  student: 'Élève',
  classes: 'Classes',
  class: 'Classe',
  teachers: 'Enseignants',
  teacher: 'Enseignant',
  level: 'Niveau',
};

const KINDERGARTEN: Omit<SchoolTerms, 'isKindergarten'> = {
  students: 'Enfants',
  student: 'Enfant',
  classes: "Groupes d'âge",
  class: 'Groupe',
  teachers: 'Animateurs',
  teacher: 'Animateur',
  level: "Tranche d'âge",
};

export function useSchoolTerms(): SchoolTerms {
  const tenantType = useAuthStore((s) => s.tenant?.type ?? null);
  return useMemo(() => {
    const isKindergarten = tenantType === 'KINDERGARTEN';
    return { isKindergarten, ...(isKindergarten ? KINDERGARTEN : PRIMARY) };
  }, [tenantType]);
}
