import { View, type ViewStyle } from 'react-native';
import { colors } from '../tokens/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Optional left accent bar color (e.g. per class/level). */
  accent?: string;
}

/** White rounded card with a soft shadow; optional left accent stripe. */
export function Card({ children, style, accent }: CardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#0f1419',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
        ...(accent ? { borderLeftWidth: 4, borderLeftColor: accent } : {}),
        ...style,
      }}
    >
      {children}
    </View>
  );
}
