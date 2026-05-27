import { CalendarCheck } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function AbsencesPage() {
  return (
    <ComingSoon
      title="Absences"
      description="Suivez les absences et retards des élèves."
      icon={CalendarCheck}
    />
  );
}