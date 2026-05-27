import { HeartHandshake } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function ParentsPage() {
  return (
    <ComingSoon
      title="Parents"
      description="Consultez le répertoire des parents et tuteurs légaux."
      icon={HeartHandshake}
    />
  );
}