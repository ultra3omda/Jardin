import { Utensils } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function CanteenPage() {
  return (
    <ComingSoon
      title="Cantine"
      description="Gérez les inscriptions et menus de la cantine scolaire."
      icon={Utensils}
    />
  );
}