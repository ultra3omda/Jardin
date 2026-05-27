import { ScrollView, Text, View } from 'react-native';

import { KpiCard, type KpiVariant, colors } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';

interface DashboardKpi {
  label: string;
  value: string;
  variant: KpiVariant;
  sub?: string;
}

interface DashboardConfig {
  heading: string;
  subtitle: string;
  kpis: DashboardKpi[];
}

/**
 * V7-B — Resolve the dashboard config for the (role, tenant.type) pair.
 * Mirrors apps/web/lib/dashboard/config.ts at a simplified level for mobile.
 */
function getMobileDashboardConfig(args: {
  role: string | undefined;
  tenantType: string | null | undefined;
  firstName: string | undefined;
}): DashboardConfig {
  const { role, tenantType, firstName } = args;
  const isKG = tenantType === 'KINDERGARTEN';
  const fn = firstName ?? 'utilisateur';

  if (role === 'SUPER_ADMIN') {
    return {
      heading: 'Plateforme',
      subtitle: '17 écoles · 3 demandes en attente',
      kpis: [
        { label: 'Écoles', value: '17', variant: 'purple' },
        { label: 'Utilisateurs', value: '1.2k', variant: 'blue' },
        { label: 'Démos', value: '3', variant: 'orange' },
      ],
    };
  }

  if (role === 'SCHOOL_ADMIN' && isKG) {
    return {
      heading: 'Tableau de Bord',
      subtitle: 'Jardin Les Pétales',
      kpis: [
        { label: 'Enfants', value: '68', variant: 'pink' },
        { label: 'Présents', value: '62', variant: 'green' },
        { label: 'Photos', value: '24', variant: 'amber' },
      ],
    };
  }
  if (role === 'SCHOOL_ADMIN') {
    return {
      heading: 'Tableau de Bord',
      subtitle: 'École Pilote',
      kpis: [
        { label: 'Élèves', value: '312', variant: 'blue' },
        { label: 'Présence', value: '92%', variant: 'green' },
        { label: 'Moyenne', value: '14.2', variant: 'amber', sub: 'Sur 17 classes' },
      ],
    };
  }

  if (role === 'TEACHER' && isKG) {
    return {
      heading: `Bonjour, ${fn}.`,
      subtitle: 'Vie quotidienne',
      kpis: [
        { label: 'Mes enfants', value: '32', variant: 'pink' },
        { label: 'Photos', value: '12', variant: 'amber' },
        { label: 'Présents', value: '29', variant: 'green' },
      ],
    };
  }
  if (role === 'TEACHER') {
    return {
      heading: `Bonjour, ${fn}.`,
      subtitle: '2 classes · 54 élèves',
      kpis: [
        { label: 'Élèves', value: '54', variant: 'blue' },
        { label: 'Évals', value: '8', variant: 'orange' },
        { label: 'Cours', value: '5', variant: 'green' },
      ],
    };
  }

  if (role === 'PARENT' && isKG) {
    return {
      heading: "Yasmine aujourd'hui",
      subtitle: 'Présente · 4 photos · 2 activités',
      kpis: [
        { label: 'Photos', value: '4', variant: 'pink' },
        { label: 'Activités', value: '2', variant: 'green' },
        { label: 'Présence', value: '✓', variant: 'amber' },
      ],
    };
  }
  if (role === 'PARENT') {
    return {
      heading: `Bonjour, ${fn}.`,
      subtitle: "2 enfants à l'École Pilote",
      kpis: [
        { label: 'Enfants', value: '2', variant: 'pink' },
        { label: 'Notes', value: '5', variant: 'amber' },
        { label: 'À payer', value: '180€', variant: 'orange' },
      ],
    };
  }

  return {
    heading: `Bonjour, ${fn}.`,
    subtitle: 'Bienvenue dans Klasso',
    kpis: [{ label: 'Bienvenue', value: '👋', variant: 'amber' }],
  };
}

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  const config = getMobileDashboardConfig({
    role: user?.role,
    tenantType: tenant?.type ?? null,
    firstName: user?.firstName,
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper[50] }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <View>
        <Text
          style={{
            fontSize: 24,
            fontWeight: '700',
            color: colors.ink[900],
            lineHeight: 28,
          }}
        >
          {config.heading}
        </Text>
        <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 4 }}>
          {config.subtitle}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {config.kpis.map((kpi, i) => (
          <KpiCard
            key={i}
            label={kpi.label}
            value={kpi.value}
            variant={kpi.variant}
            sub={kpi.sub}
          />
        ))}
      </View>
    </ScrollView>
  );
}
