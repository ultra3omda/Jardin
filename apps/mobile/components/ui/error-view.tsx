import { Pressable, Text, View } from 'react-native';
import { colors, radius } from '@klasso/ui-mobile';

interface ErrorViewProps {
  /** Error message shown below the icon. Defaults to a generic French message. */
  message?: string;
  /** Callback for the "Réessayer" button. If omitted, button is hidden. */
  onRetry?: () => void;
}

/**
 * Reusable full-screen error state for React Native screens.
 * Matches the inline error pattern used in messages.tsx and pedagogy.tsx.
 *
 * @example
 * if (isError) return <ErrorView message="Impossible de charger les messages." onRetry={() => void refetch()} />;
 */
export function ErrorView({ message, onRetry }: ErrorViewProps) {
  const text = message ?? 'Une erreur est survenue. Veuillez réessayer.';

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: 32,
      }}
    >
      <Text style={{ fontSize: 36, marginBottom: 16 }} aria-hidden>
        ⚠️
      </Text>

      <Text
        style={{
          fontSize: 14,
          color: colors.ink[500],
          textAlign: 'center',
          marginBottom: onRetry ? 20 : 0,
          lineHeight: 20,
        }}
      >
        {text}
      </Text>

      {onRetry && (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Réessayer"
          style={{
            backgroundColor: '#fbb13c',
            borderRadius: radius.md,
            paddingHorizontal: 24,
            paddingVertical: 11,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f1419' }}>
            Réessayer
          </Text>
        </Pressable>
      )}
    </View>
  );
}
