import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../tokens/colors';

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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        position: 'absolute',
        right: 18,
        bottom: 24,
        backgroundColor: colors.ambre[500],
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
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Ionicons name={icon} size={26} color={colors.white} />
      {extended ? (
        <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700' }}>{label}</Text>
      ) : (
        <View />
      )}
    </Pressable>
  );
}
