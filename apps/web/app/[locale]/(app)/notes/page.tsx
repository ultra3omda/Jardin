import { ClipboardList } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function NotesPage() {
  return (
    <ComingSoon
      title="Notes"
      description="Saisissez et consultez les notes des élèves par matière."
      icon={ClipboardList}
    />
  );
}