import { UserPlus } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function EnrollmentsPage() {
  return (
    <ComingSoon
      title="Inscriptions"
      description="Gérez les inscriptions et dossiers d'admission des élèves."
      icon={UserPlus}
    />
  );
}