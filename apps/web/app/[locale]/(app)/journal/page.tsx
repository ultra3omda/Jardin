import { Camera } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function JournalPage() {
  return (
    <ComingSoon
      title="Journal quotidien"
      description="Suivez les activités journalières de la classe."
      icon={Camera}
    />
  );
}