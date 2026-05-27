import { Calendar } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function SchedulePage() {
  return (
    <ComingSoon
      title="Emploi du temps"
      description="Consultez et gérez les emplois du temps des classes et enseignants."
      icon={Calendar}
    />
  );
}