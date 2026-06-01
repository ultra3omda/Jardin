import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '../tokens/colors';

interface FormSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Sticky footer, typically a row of Buttons. */
  footer?: React.ReactNode;
}

/**
 * Slide-up sheet hosting a create/edit form: header with title + close, a
 * scrollable body, and an optional sticky footer. Reused by all "create" flows.
 */
export function FormSheet({ visible, title, onClose, children, footer }: FormSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,20,25,0.4)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ maxHeight: '92%' }}
        >
          <View
            style={{
              backgroundColor: colors.paper[50],
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 12,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.paper[100],
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink[900] }}>{title}</Text>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.ink[500]} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {footer ? (
              <View
                style={{
                  padding: 16,
                  paddingBottom: Platform.OS === 'ios' ? 28 : 16,
                  borderTopWidth: 1,
                  borderTopColor: colors.paper[100],
                }}
              >
                {footer}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
