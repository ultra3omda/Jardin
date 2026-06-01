import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/spacing';

export interface PickerOption {
  value: string;
  label: string;
  /** Secondary line (e.g. an email or level). */
  hint?: string;
}

interface PickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: PickerOption[];
  required?: boolean;
  error?: string;
  placeholder?: string;
  /** Text shown inside the sheet when no option matches the search. */
  emptyText?: string;
  /** Disable opening (e.g. when there are no options). */
  disabled?: boolean;
}

/**
 * Searchable single-choice picker — the mobile twin of the web `ComboPicker`.
 * Tapping the field opens a full-height sheet with a search box and a filtered
 * list. Every choice list in the app uses this (no raw id text inputs).
 */
export function Picker({
  label,
  value,
  onChange,
  options,
  required,
  error,
  placeholder = 'Sélectionner…',
  emptyText = 'Aucun résultat.',
  disabled,
}: PickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || (o.hint ?? '').toLowerCase().includes(q),
    );
  }, [options, query]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setQuery('');
  }

  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{ fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: 6 }}
      >
        {label}
        {required ? <Text style={{ color: colors.ambre[600] }}> *</Text> : null}
      </Text>

      <Pressable
        onPress={() => !disabled && setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${selected ? selected.label : placeholder}`}
        style={{
          minHeight: 46,
          borderWidth: 1,
          borderColor: error ? colors.status.danger500 : colors.paper[100],
          borderRadius: radius.md,
          backgroundColor: disabled ? colors.paper[50] : colors.surface,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 15,
            color: selected ? colors.ink[900] : colors.ink[300],
          }}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.ink[300]} />
      </Pressable>

      {error ? (
        <Text style={{ fontSize: 12, color: colors.status.danger500, marginTop: 4 }}>{error}</Text>
      ) : null}

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15,20,25,0.4)', justifyContent: 'flex-end' }}>
          <View
            style={{
              maxHeight: '80%',
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
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink[900] }}>{label}</Text>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                hitSlop={8}
              >
                <Ionicons name="close" size={24} color={colors.ink[500]} />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.paper[100],
                  borderRadius: radius.md,
                  paddingHorizontal: 10,
                }}
              >
                <Ionicons name="search" size={18} color={colors.ink[300]} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Rechercher…"
                  placeholderTextColor={colors.ink[300]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Rechercher dans la liste"
                  style={{ flex: 1, height: 44, marginLeft: 8, fontSize: 15, color: colors.ink[900] }}
                />
              </View>
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(o) => o.value}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
              ListEmptyComponent={
                <Text style={{ padding: 16, color: colors.ink[300], textAlign: 'center' }}>
                  {emptyText}
                </Text>
              }
              renderItem={({ item }) => {
                const isSel = item.value === value;
                return (
                  <Pressable
                    onPress={() => pick(item.value)}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      marginTop: 8,
                      borderRadius: radius.md,
                      backgroundColor: isSel ? colors.ambre[50] : colors.surface,
                      borderWidth: 1,
                      borderColor: isSel ? colors.ambre[100] : colors.paper[100],
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink[900] }}>
                        {item.label}
                      </Text>
                      {item.hint ? (
                        <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 2 }}>
                          {item.hint}
                        </Text>
                      ) : null}
                    </View>
                    {isSel ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.ambre[600]} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
