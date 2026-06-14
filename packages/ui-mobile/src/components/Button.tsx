import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import { colors } from '../tokens/colors';
import { fonts } from '../tokens/fonts';
import { radius } from '../tokens/spacing';
import { useTheme } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

/**
 * V7-B — Primary CTA button. Default variant is `primary` (tenant accent,
 * full-width-friendly). `secondary` = white + ink text. `ghost` = no bg.
 * `danger` = solid red, for destructive actions (logout, delete) — same red
 * as ConfirmDialog's destructive confirm.
 */
export function Button({ label, variant = 'primary', loading, disabled, ...rest }: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? colors.status.danger500
        : variant === 'secondary'
          ? colors.surface
          : 'transparent';
  const fg =
    variant === 'primary' ? theme.onPrimary : variant === 'danger' ? colors.white : colors.ink[900];
  // Visible hairline border so `secondary` (white) reads as a button on the
  // cream page background (`paper[50]`). `paper[100]` is lighter than the page,
  // so it was effectively invisible.
  const borderColor = variant === 'secondary' ? colors.line : 'transparent';

  // Soft elevation so solid buttons lift off the page (ghost stays flat).
  const shadow =
    variant === 'ghost'
      ? null
      : {
          shadowColor: colors.ink[900],
          shadowOpacity: 0.1,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        };

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      // Static style array (no style-as-function) so the background/border
      // always render; Android gets a ripple for press feedback.
      android_ripple={{ color: 'rgba(15,20,25,0.10)' }}
      style={[
        {
          backgroundColor: bg,
          borderWidth: 1,
          borderColor,
          borderRadius: radius.lg,
          paddingVertical: 14,
          paddingHorizontal: 18,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          opacity: isDisabled ? 0.5 : 1,
        },
        shadow,
      ]}
    >
      {loading && <ActivityIndicator color={fg} style={{ marginEnd: 8 }} />}
      <Text style={{ color: fg, fontSize: 15, fontWeight: '600', fontFamily: fonts.bodySemibold }}>
        {label}
      </Text>
    </Pressable>
  );
}
