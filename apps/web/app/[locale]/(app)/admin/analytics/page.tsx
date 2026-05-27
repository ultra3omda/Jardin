import { Shield } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function AdminAnalyticsPage() {
  return (
    <ComingSoon
      title="Analytics"
      description="Statistiques et métriques de la plateforme."
      icon={Shield}
    />
  );
}