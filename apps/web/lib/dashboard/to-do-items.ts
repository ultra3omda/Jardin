import { Wallet, UserX } from 'lucide-react';
import type { ToDoItem } from '@/components/dashboard/to-do-panel';

/** Sous-ensemble de l'overview dashboard nécessaire au panneau « À traiter ». */
export interface ToDoOverview {
  pendingPayments: number;
  amountDue: number;
  todayAttendance: { absent: number; late: number };
}

/**
 * Construit les items « À traiter aujourd'hui » selon le rôle :
 * - PARENT : factures à régler (→ /payments).
 * - SCHOOL_ADMIN / STAFF : paiements en retard (→ /frais/impayes) + absences/retards du jour.
 * - autres rôles : aucun item.
 */
export function buildToDoItems(role: string, data: ToDoOverview | undefined): ToDoItem[] {
  const items: ToDoItem[] = [];
  if (!data) return items;

  const isParent = role === 'PARENT';
  const isAdminLike = role === 'SCHOOL_ADMIN' || role === 'STAFF';
  if (!isParent && !isAdminLike) return items;

  if (data.pendingPayments > 0) {
    const plural = data.pendingPayments > 1;
    items.push({
      id: 'unpaid',
      icon: Wallet,
      value: String(data.pendingPayments),
      label: isParent
        ? plural
          ? 'factures à régler'
          : 'facture à régler'
        : plural
          ? 'paiements en retard'
          : 'paiement en retard',
      detail: isParent ? `${data.amountDue} TND` : `${data.amountDue} TND à recouvrer`,
      href: isParent ? '/payments' : '/frais/impayes',
      cta: isParent ? 'Régler' : 'Voir',
      tone: 'danger',
    });
  }

  if (isAdminLike) {
    const absToday = data.todayAttendance.absent + data.todayAttendance.late;
    if (absToday > 0) {
      items.push({
        id: 'absences',
        icon: UserX,
        value: String(absToday),
        label: 'absences/retards du jour',
        href: '/absences',
        cta: 'Pointer',
        tone: 'warn',
      });
    }
  }

  return items;
}
