import { ShieldAlert } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function SecurityPage() {
  return (
    <ComingSoon
      title="Sécurité"
      description="Gérez les accès, rondes et incidents de sécurité."
      icon={ShieldAlert}
    />
  );
}