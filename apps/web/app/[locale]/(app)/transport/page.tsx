import { Bus } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function TransportPage() {
  return (
    <ComingSoon
      title="Transport"
      description="Gérez les circuits de transport scolaire."
      icon={Bus}
    />
  );
}