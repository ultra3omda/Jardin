import { ChildDetail } from './child-detail';

/** Parent-facing detail view for one of their children. */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default function ChildDetailPage({ params }: PageProps) {
  return <ChildDetail id={params.id} />;
}
