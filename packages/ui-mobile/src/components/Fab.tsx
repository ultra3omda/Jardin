import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../tokens/colors';
import { fonts } from '../tokens/fonts';
import { useTheme } from '../theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface FabProps {
  onPress: () => void;
  /** Accessible action label, e.g. "Ajouter un élève". */
  label: string;
  icon?: IoniconName;
  /** When set, shows the label next to the icon (extended FAB). */
  extended?: boolean;
}

/**
 * Floating action button anchored bottom-right of a screen. Used to trigger
 * "create" flows (add student, add class, …) for roles allowed to write.
 */
export function Fab({ onPress, label, icon = 'add', extended }: FabProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: 'rgba(255,255,255,0.18)', borderless: false }}
      // Static style (no style-as-function) so the background/shadow always
      // render — a Pressable style callback was not painting on this build.
      style={{
        position: 'absolute',
        end: 18,
        bottom: 24,
        backgroundColor: theme.primary,
        borderRadius: 28,
        height: 56,
        paddingHorizontal: extended ? 20 : 0,
        width: extended ? undefined : 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: extended ? 8 : 0,
        shadowColor: '#0f1419',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <Ionicons name={icon} size={26} color={colors.white} />
      {extended ? (
        <Text style={{ color: colors.white, fontSize: 15, fontFamily: fonts.bodyBold }}>{label}</Text>
      ) : (
        <View />
      )}
    </Pressable>
  );
}
