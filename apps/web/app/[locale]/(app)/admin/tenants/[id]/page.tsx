import { TenantDetail } from './tenant-detail';

export const dynamic = 'force-dynamic';

export default function TenantDetailPage({ params }: { params: { id: string } }) {
  return <TenantDetail id={params.id} />;
}
