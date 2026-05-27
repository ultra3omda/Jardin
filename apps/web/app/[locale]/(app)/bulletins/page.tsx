import { FileText } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function BulletinsPage() {
  return (
    <ComingSoon
      title="Bulletins"
      description="Générez et consultez les bulletins de notes des élèves."
      icon={FileText}
    />
  );
}