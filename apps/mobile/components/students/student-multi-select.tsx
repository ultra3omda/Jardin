import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors } from '@klasso/ui-mobile';
import {
  clearSelection,
  isAllSelected,
  selectAllStudents,
  selectionToArray,
  toggleStudent,
} from '@ecole-saas/shared';

interface StudentLite {
  id: string;
  firstName: string;
  lastName: string;
}

interface StudentMultiSelectProps {
  students: StudentLite[];
  /** Controlled selection — ids currently checked. */
  value: string[];
  onChange: (ids: string[]) => void;
  emptyHint?: string;
}

/**
 * Reusable "pick students" control (mobile). Controlled: the parent decides the
 * initial selection (whole class for activity/photo, current set for transport,
 * …). Provides Tout / Aucun shortcuts, a counter and per-student toggles.
 * Shares its rules with web via @ecole-saas/shared.
 */
export function StudentMultiSelect({
  students,
  value,
  onChange,
  emptyHint = 'Aucun élève.',
}: StudentMultiSelectProps) {
  const allIds = students.map((s) => s.id);
  const selected = new Set(value);
  const allChecked = isAllSelected(selected, allIds);

  if (students.length === 0) {
    return <Text style={{ fontSize: 13, color: colors.ink[500] }}>{emptyHint}</Text>;
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Pressable
          onPress={() => onChange(selectionToArray(selectAllStudents(allIds)))}
          disabled={allChecked}
          style={{
            borderWidth: 1,
            borderColor: colors.paper[100],
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 5,
            opacity: allChecked ? 0.4 : 1,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink[900] }}>Tout</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange(selectionToArray(clearSelection()))}
          disabled={value.length === 0}
          style={{
            borderWidth: 1,
            borderColor: colors.paper[100],
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 5,
            opacity: value.length === 0 ? 0.4 : 1,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink[900] }}>Aucun</Text>
        </Pressable>
        <Text style={{ marginLeft: 'auto', fontSize: 12, color: colors.ink[500] }}>
          {value.length}/{students.length}
        </Text>
      </View>

      <ScrollView style={{ maxHeight: 280 }} keyboardShouldPersistTaps="handled">
        {students.map((s) => {
          const checked = selected.has(s.id);
          return (
            <Pressable
              key={s.id}
              onPress={() => onChange(selectionToArray(toggleStudent(selected, s.id)))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={`${s.firstName} ${s.lastName}`}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: checked ? colors.ambre[500] : colors.paper[100],
                  backgroundColor: checked ? colors.ambre[500] : colors.white,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {checked ? (
                  <Text style={{ color: colors.white, fontSize: 13, fontWeight: '900' }}>✓</Text>
                ) : null}
              </View>
              <Text style={{ fontSize: 14, color: colors.ink[900] }}>
                {s.firstName} {s.lastName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
