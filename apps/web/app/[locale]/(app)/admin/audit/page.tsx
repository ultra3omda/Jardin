import { Shield } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function AdminAuditPage() {
  return (
    <ComingSoon
      title="Audit logs"
      description="Consultez les journaux d'audit de la plateforme."
      icon={Shield}
    />
  );
}