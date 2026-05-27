import { Text, View } from 'react-native';
import { colors } from '@klasso/ui-mobile';

export default function MessagesScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper[50],
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: '700',
          color: colors.ink[900],
          marginBottom: 8,
        }}
      >
        Messages
      </Text>
      <Text style={{ fontSize: 13, color: colors.ink[500], textAlign: 'center' }}>
        Disponible bientôt sur mobile (V3-B web déjà livré).
      </Text>
    </View>
  );
}
