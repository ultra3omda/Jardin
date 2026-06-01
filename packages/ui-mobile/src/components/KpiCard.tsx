import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/spacing';

export type KpiVariant = 'blue' | 'green' | 'orange' | 'amber' | 'pink' | 'purple';

const VARIANT_BG: Record<KpiVariant, string> = {
  blue: '#2563eb',
  green: '#059669',
  orange: colors.ambre[500],
  amber: '#d97706',
  pink: '#db2777',
  purple: '#7c3aed',
};

const VARIANT_TINT: Record<KpiVariant, string> = {
  blue: 'rgba(37,99,235,0.10)',
  green: 'rgba(5,150,105,0.10)',
  orange: 'rgba(242,104,63,0.10)',
  amber: 'rgba(217,119,6,0.10)',
  pink: 'rgba(219,39,119,0.10)',
  purple: 'rgba(124,58,237,0.10)',
};

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface KpiCardProps {
  label: string;
  value: string;
  variant: KpiVariant;
  sub?: string;
  icon?: IoniconName;
}

/**
 * KPI card mirroring the web design: white rounded card, soft shadow, a tinted
 * rounded icon badge top-right, large bold value, optional sub-label.
 */
export function KpiCard({ label, value, variant, sub, icon = 'stats-chart' }: KpiCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 16,
        flex: 1,
        shadowColor: '#0f1419',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 14,
        }}
      >
        <Text
          style={{
            color: colors.ink[500],
            fontSize: 10,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            flex: 1,
            paddingRight: 8,
          }}
          numberOfLines={2}
        >
          {label}
        </Text>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: VARIANT_TINT[variant],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={19} color={VARIANT_BG[variant]} />
        </View>
      </View>
      <Text style={{ color: colors.ink[900], fontSize: 28, fontWeight: '800', lineHeight: 30 }}>
        {value}
      </Text>
      {sub ? (
        <Text style={{ color: colors.ink[500], fontSize: 11, marginTop: 3 }}>{sub}</Text>
      ) : null}
    </View>
  );
}
