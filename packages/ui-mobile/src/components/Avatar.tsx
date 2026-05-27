import { Text, View } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/spacing';

interface AvatarProps {
  initials: string;
  size?: number;
}

/**
 * V7-B — Round avatar with ambre solid background.
 */
export function Avatar({ initials, size = 32 }: AvatarProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: colors.ambre[500],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.white,
          fontWeight: '700',
          fontSize: Math.round(size * 0.4),
        }}
      >
        {initials.toUpperCase()}
      </Text>
    </View>
  );
}
