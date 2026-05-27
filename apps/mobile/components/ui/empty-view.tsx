import { Text, View } from 'react-native';
import { colors } from '@klasso/ui-mobile';

interface EmptyViewProps {
  /** Emoji displayed as the visual focal point (e.g. '📭', '🎓') */
  icon?: string;
  /** Primary text — short and descriptive */
  title: string;
  /** Optional secondary text with more detail */
  subtitle?: string;
}

/**
 * Reusable empty-state component for lists and screens with no data.
 *
 * @example
 * {items.length === 0 && (
 *   <EmptyView icon="📭" title="Aucun message" subtitle="Vos conversations apparaîtront ici." />
 * )}
 */
export function EmptyView({ icon, title, subtitle }: EmptyViewProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
        paddingHorizontal: 32,
      }}
      accessibilityRole="text"
      accessibilityLabel={title}
    >
      {icon && (
        <Text style={{ fontSize: 40, marginBottom: 14 }} aria-hidden>
          {icon}
        </Text>
      )}

      <Text
        style={{
          fontSize: 15,
          fontWeight: '600',
          color: colors.ink[900],
          textAlign: 'center',
          marginBottom: subtitle ? 6 : 0,
        }}
      >
        {title}
      </Text>

      {subtitle && (
        <Text
          style={{
            fontSize: 13,
            color: colors.ink[500],
            textAlign: 'center',
            lineHeight: 19,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}
