import { Stethoscope } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function HealthPage() {
  return (
    <ComingSoon
      title="Santé"
      description="Suivez le dossier médical et les visites médicales des élèves."
      icon={Stethoscope}
    />
  );
}