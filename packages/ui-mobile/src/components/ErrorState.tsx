import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { colors } from '../tokens/colors';
import { fonts } from '../tokens/fonts';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  retryLabel?: string;
  /** When provided, renders a retry button. */
  onRetry?: () => void;
}

/**
 * Error state with an optional retry action — the mobile counterpart of the web
 * `ErrorRetry`. Announced as an alert to assistive tech.
 */
export function ErrorState({ message, retryLabel = 'Réessayer', onRetry }: ErrorStateProps) {
  return (
    <View
      accessibilityRole="alert"
      style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          // Soft danger tint (danger500 @ 12%) — no danger-100 token exists.
          backgroundColor: 'rgba(239,68,68,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Ionicons name="alert-circle-outline" size={32} color={colors.status.danger500} />
      </View>
      <Text
        style={{
          color: colors.ink[900],
          fontSize: 16,
          fontFamily: fonts.display,
          textAlign: 'center',
        }}
      >
        {message ?? 'Une erreur est survenue.'}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: 16, alignSelf: 'stretch' }}>
          <Button label={retryLabel} variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
