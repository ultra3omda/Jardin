import { Wallet } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function HrPage() {
  return (
    <ComingSoon
      title="RH / Paie"
      description="Gérez les contrats, congés et fiches de paie du personnel."
      icon={Wallet}
    />
  );
}