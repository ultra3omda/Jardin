import { View, Text } from 'react-native';
import { colors, radius } from '@klasso/ui-mobile';

import { useCanteenMenus, type CanteenMenu } from '@/lib/api/school-life';
import { EmptyView } from '@/components/ui/empty-view';
import { ErrorView } from '@/components/ui/error-view';
import { CardSkeleton } from '@/components/ui/card-skeleton';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', marginTop: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink[500], width: 88 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, color: colors.ink[700], flex: 1 }}>{value}</Text>
    </View>
  );
}

function MenuCard({ menu }: { menu: CanteenMenu }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.paper[100],
        marginBottom: 10,
      }}
    >
      <Text
        style={{ fontSize: 14, fontWeight: '700', color: colors.ink[900], textTransform: 'capitalize' }}
      >
        {formatDate(menu.date)}
      </Text>
      {menu.starter ? <Line label="Entrée" value={menu.starter} /> : null}
      {menu.main ? <Line label="Plat" value={menu.main} /> : null}
      {menu.dessert ? <Line label="Dessert" value={menu.dessert} /> : null}
      {menu.vegetarian ? <Line label="Végétarien" value={menu.vegetarian} /> : null}
    </View>
  );
}

export function CanteenSection() {
  const { data, isLoading, isError, refetch } = useCanteenMenus();
  const menus = data?.items ?? [];

  if (isLoading) {
    return (
      <View style={{ gap: 10 }}>
        <CardSkeleton height={100} />
        <CardSkeleton height={100} />
      </View>
    );
  }
  if (isError) {
    return <ErrorView message="Impossible de charger les menus." onRetry={() => void refetch()} />;
  }
  if (menus.length === 0) {
    return (
      <EmptyView icon="🍽️" title="Aucun menu" subtitle="Les menus de la cantine apparaîtront ici." />
    );
  }

  return (
    <View>
      {menus.map((m) => (
        <MenuCard key={m.id} menu={m} />
      ))}
    </View>
  );
}
