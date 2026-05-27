import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/spacing';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

/**
 * V7-B — Primary CTA button. Default variant is `primary` (ambre orange,
 * full-width-friendly). `secondary` = white + navy text. `ghost` = no bg.
 */
export function Button({ label, variant = 'primary', loading, disabled, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary'
      ? colors.ambre[500]
      : variant === 'secondary'
        ? colors.surface
        : 'transparent';
  const fg = variant === 'primary' ? colors.white : colors.ink[900];
  const borderColor = variant === 'secondary' ? colors.paper[100] : 'transparent';

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderWidth: 1,
        borderColor,
        borderRadius: radius.lg,
        paddingVertical: 14,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      {loading && <ActivityIndicator color={fg} style={{ marginRight: 8 }} />}
      <Text style={{ color: fg, fontSize: 15, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
