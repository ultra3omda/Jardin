import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/spacing';

interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  /** Field label shown above the input. */
  label: string;
  /** Marks the field as required (adds a coral asterisk). */
  required?: boolean;
  /** Inline validation error, shown in red below the input. */
  error?: string;
  /** Helper text shown below the input when there is no error. */
  hint?: string;
  /** Render as a multi-line textarea. */
  multiline?: boolean;
}

/**
 * Labeled text input used across all mobile write forms. Mirrors the web
 * field pattern (label + input + error). For choice fields use `Picker`.
 */
export function FormField({
  label,
  required,
  error,
  hint,
  multiline,
  ...inputProps
}: FormFieldProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{ fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: 6 }}
      >
        {label}
        {required ? <Text style={{ color: colors.ambre[600] }}> *</Text> : null}
      </Text>
      <TextInput
        {...inputProps}
        multiline={multiline}
        placeholderTextColor={colors.ink[300]}
        accessibilityLabel={label}
        style={{
          minHeight: multiline ? 88 : 46,
          borderWidth: 1,
          borderColor: error ? colors.status.danger500 : colors.paper[100],
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 0,
          fontSize: 15,
          color: colors.ink[900],
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
      {error ? (
        <Text style={{ fontSize: 12, color: colors.status.danger500, marginTop: 4 }}>{error}</Text>
      ) : hint ? (
        <Text style={{ fontSize: 12, color: colors.ink[300], marginTop: 4 }}>{hint}</Text>
      ) : null}
    </View>
  );
}
