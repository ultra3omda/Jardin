import { GraduationCap } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function TeachersPage() {
  return (
    <ComingSoon
      title="Enseignants"
      description="Gérez les enseignants et leur affectation aux classes."
      icon={GraduationCap}
    />
  );
}