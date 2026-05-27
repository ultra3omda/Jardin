import { LayoutDashboard } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function AdminDashboardPage() {
  return (
    <ComingSoon
      title="Vue plateforme"
      description="Tableau de bord de la plateforme multi-tenant."
      icon={LayoutDashboard}
    />
  );
}