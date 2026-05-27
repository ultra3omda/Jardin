import { BookOpen } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function EvaluationsPage() {
  return (
    <ComingSoon
      title="Évaluations"
      description="Planifiez et gérez les évaluations et examens."
      icon={BookOpen}
    />
  );
}