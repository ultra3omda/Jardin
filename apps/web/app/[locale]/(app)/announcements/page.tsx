import { Megaphone } from 'lucide-react';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function AnnouncementsPage() {
  return (
    <ComingSoon
      title="Annonces"
      description="Publiez et consultez les annonces de l'établissement."
      icon={Megaphone}
    />
  );
}