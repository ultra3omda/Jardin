import { Text, View } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/spacing';

export type KpiVariant = 'blue' | 'green' | 'orange' | 'amber' | 'pink' | 'purple';

const VARIANT_BG: Record<KpiVariant, string> = {
  blue: '#1d4ed8',
  green: '#059669',
  orange: colors.ambre[600],
  amber: '#d97706',
  pink: '#be185d',
  purple: '#6d28d9',
};

interface KpiCardProps {
  label: string;
  value: string;
  variant: KpiVariant;
  sub?: string;
}

/**
 * V7-B — KPI card mirroring the web KpiCard. Mobile uses a flat
 * solid color box (no gradient in RN without extra deps).
 */
export function KpiCard({ label, value, variant, sub }: KpiCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: 16,
        flex: 1,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: colors.ink[500],
            fontSize: 10,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: radius.md,
            backgroundColor: VARIANT_BG[variant],
          }}
        />
      </View>
      <Text
        style={{
          color: colors.ink[900],
          fontSize: 26,
          fontWeight: '800',
          lineHeight: 28,
        }}
      >
        {value}
      </Text>
      {sub && (
        <Text style={{ color: colors.ink[500], fontSize: 11, marginTop: 2 }}>{sub}</Text>
      )}
    </View>
  );
}
