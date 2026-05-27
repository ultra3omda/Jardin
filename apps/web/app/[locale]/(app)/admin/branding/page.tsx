import { Settings } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function AdminBrandingPage() {
  return (
    <ComingSoon
      title="Apparence globale"
      description="Personnalisez l'apparence globale de la plateforme."
      icon={Settings}
    />
  );
}