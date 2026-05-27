import { CreditCard } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function PaymentsPage() {
  return (
    <ComingSoon
      title="Paiements"
      description="Consultez l'historique des paiements et règlements."
      icon={CreditCard}
    />
  );
}