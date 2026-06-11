import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { colors } from '../tokens/colors';
import { fonts } from '../tokens/fonts';

interface EmptyStateProps {
  icon?: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
}

/** Friendly empty state: a soft circular icon, title and helper text. */
export function EmptyState({ icon = 'sparkles-outline', title, description }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.ambre[50],
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon} size={32} color={colors.ambre[500]} />
      </View>
      <Text style={{ color: colors.ink[900], fontSize: 18, fontFamily: fonts.display, textAlign: 'center' }}>
        {title}
      </Text>
      {description ? (
        <Text
          style={{
            color: colors.ink[500],
            fontSize: 13,
            textAlign: 'center',
            marginTop: 6,
            lineHeight: 19,
            fontFamily: fonts.body,
          }}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}
