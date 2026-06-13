import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, FormSheet, colors } from '@klasso/ui-mobile';
import { StudentMultiSelect } from '@/components/students/student-multi-select';
import { listStudents } from '@/lib/api/students';
import {
  BUS_ROUTES_KEY,
  createTransportAssignment,
  deleteTransportAssignment,
  diffStudentAssignments,
  useTransportAssignments,
  type BusRoute,
} from '@/lib/api/transport';

interface AssignStudentsSheetProps {
  route: BusRoute | null;
  visible: boolean;
  onClose: () => void;
}

/**
 * Sheet to assign students to a bus route (élève ↔ ligne). Pre-checks the
 * students already on the route; on save, reconciles the new selection against
 * the current one (single create/delete per student). Direction defaults to
 * BOTH (aller-retour) — fine-grained direction stays on the web for now.
 */
export function AssignStudentsSheet({ route, visible, onClose }: AssignStudentsSheetProps) {
  const qc = useQueryClient();
  const routeId = route?.id ?? null;

  const studentsQuery = useQuery({
    queryKey: ['students', 'picker'] as const,
    queryFn: () => listStudents({ pageSize: 200 }),
    enabled: visible,
  });
  const assignmentsQuery = useTransportAssignments(visible ? routeId : null);

  const students = studentsQuery.data?.items ?? [];
  const currentIds = useMemo(
    () => (assignmentsQuery.data?.items ?? []).map((a) => a.studentId),
    [assignmentsQuery.data],
  );
  const assignmentIdByStudent = useMemo(
    () => new Map((assignmentsQuery.data?.items ?? []).map((a) => [a.studentId, a.id])),
    [assignmentsQuery.data],
  );

  const [selected, setSelected] = useState<string[]>([]);
  // Initialise the selection from the current assignments each time the sheet
  // opens or the assignments load.
  useEffect(() => {
    setSelected(currentIds);
  }, [currentIds, visible]);

  const saveM = useMutation({
    mutationFn: async () => {
      if (!routeId) return;
      const { toAdd, toRemove } = diffStudentAssignments(currentIds, selected);
      for (const studentId of toAdd) {
        await createTransportAssignment({ studentId, routeId, direction: 'BOTH' });
      }
      for (const studentId of toRemove) {
        const id = assignmentIdByStudent.get(studentId);
        if (id) await deleteTransportAssignment(id);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BUS_ROUTES_KEY });
      void qc.invalidateQueries({ queryKey: ['transport-assignments', routeId ?? 'none'] });
      onClose();
    },
  });

  const loading = studentsQuery.isLoading || assignmentsQuery.isLoading;

  return (
    <FormSheet
      visible={visible}
      title={`Affecter — ${route?.name ?? ''}`}
      onClose={onClose}
      footer={
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button label="Annuler" variant="secondary" onPress={onClose} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Enregistrer" onPress={() => saveM.mutate()} loading={saveM.isPending} />
          </View>
        </View>
      }
    >
      {loading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginVertical: 24 }} />
      ) : (
        <StudentMultiSelect
          students={students}
          value={selected}
          onChange={setSelected}
          emptyHint="Aucun élève dans l'établissement."
        />
      )}
      {saveM.error ? (
        <Text style={{ fontSize: 13, color: colors.status.danger500, marginTop: 8 }}>
          Erreur : {(saveM.error as Error).message}
        </Text>
      ) : null}
    </FormSheet>
  );
}
