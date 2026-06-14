import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { colors } from '../tokens/colors';
import { fonts } from '../tokens/fonts';
import { radius } from '../tokens/spacing';

export type KpiVariant = 'blue' | 'green' | 'orange' | 'amber' | 'pink' | 'purple';

// Médina earthen palette — teal, terracotta, gold, deep green.
const VARIANT_BG: Record<KpiVariant, string> = {
  blue: colors.teal[500],
  green: '#0b7a5e',
  orange: colors.ambre[500],
  amber: colors.gold[500],
  pink: colors.ambre[700],
  purple: colors.teal[700],
};

const VARIANT_TINT: Record<KpiVariant, string> = {
  blue: 'rgba(15,118,110,0.12)',
  green: 'rgba(11,122,94,0.12)',
  orange: 'rgba(242,104,63,0.12)',
  amber: 'rgba(217,154,43,0.14)',
  pink: 'rgba(156,51,24,0.12)',
  purple: 'rgba(10,74,69,0.12)',
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
            fontFamily: fonts.bodyBold,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            flex: 1,
            paddingEnd: 8,
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
      <Text
        style={{
          color: colors.ink[900],
          fontSize: 30,
          fontFamily: fonts.displayBold,
          lineHeight: 34,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      {sub ? (
        <Text style={{ color: colors.ink[500], fontSize: 11, marginTop: 3, fontFamily: fonts.body }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
