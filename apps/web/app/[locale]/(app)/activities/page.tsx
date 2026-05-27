import { Sparkles } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function ActivitiesPage() {
  return (
    <ComingSoon
      title="Activités"
      description="Planifiez et gérez les activités pédagogiques."
      icon={Sparkles}
    />
  );
}