import { Bell } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function AdminDemoPage() {
  return (
    <ComingSoon
      title="Demandes de démo"
      description="Gérez les demandes de démonstration entrantes."
      icon={Bell}
    />
  );
}