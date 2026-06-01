import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/spacing';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for irreversible actions (delete). */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Centered confirmation dialog used before any destructive or irreversible
 * mutation (e.g. soft-deleting a student).
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBg = destructive ? colors.status.danger500 : colors.ambre[500];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,20,25,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: colors.surface,
            borderRadius: 18,
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink[900], marginBottom: 8 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 14, color: colors.ink[500], lineHeight: 20, marginBottom: 20 }}>
            {message}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={onCancel}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.paper[100],
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink[700] }}>
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: radius.md,
                backgroundColor: confirmBg,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <ActivityIndicator color={colors.white} style={{ marginRight: 8 }} /> : null}
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
