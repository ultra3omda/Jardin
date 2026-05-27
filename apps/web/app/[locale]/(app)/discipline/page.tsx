import { Scale } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function DisciplinePage() {
  return (
    <ComingSoon
      title="Discipline"
      description="Gérez les incidents disciplinaires et sanctions."
      icon={Scale}
    />
  );
}