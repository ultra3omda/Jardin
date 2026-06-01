import { Text, View } from 'react-native';
import { colors } from '../tokens/colors';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional right-side node (e.g. avatar / action). */
  right?: React.ReactNode;
}

/**
 * Playful screen header echoing the web: a short coral accent bar, a big bold
 * title and a muted subtitle. Used at the top of every mobile screen.
 */
export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 18,
      }}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            width: 34,
            height: 5,
            borderRadius: 3,
            backgroundColor: colors.ambre[500],
            marginBottom: 10,
          }}
        />
        <Text style={{ color: colors.ink[900], fontSize: 26, fontWeight: '800', letterSpacing: -0.4 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.ink[500], fontSize: 13, marginTop: 3 }}>{subtitle}</Text>
        ) : null}
      </View>
      {right ? <View style={{ marginLeft: 12 }}>{right}</View> : null}
    </View>
  );
}
