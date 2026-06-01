import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '@klasso/ui-mobile';
import { StudentForm } from '@/components/students/student-form';
import { useAuthStore } from '@/lib/auth/store';
import { getStudent } from '@/lib/api/students';

/**
 * Édition d'un élève (admin uniquement).
 */
export default function EditStudentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useAuthStore((s) => s.user?.role);

  const { data, isLoading, error } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id!),
    enabled: !!id,
  });

  if (role !== 'SCHOOL_ADMIN') {
    return (
      <Centered>
        <Text style={{ color: colors.ink[500], textAlign: 'center' }}>
          Seule la direction peut modifier un élève.
        </Text>
      </Centered>
    );
  }
  if (isLoading) {
    return (
      <Centered>
        <ActivityIndicator color={colors.ambre[500]} />
      </Centered>
    );
  }
  if (error || !data) {
    return (
      <Centered>
        <Text style={{ color: colors.status.danger500, textAlign: 'center' }}>
          {error ? (error as Error).message : 'Élève introuvable.'}
        </Text>
      </Centered>
    );
  }

  return (
    <StudentForm
      mode="edit"
      student={data}
      onSuccess={(s) => router.replace({ pathname: '/(app)/students/[id]', params: { id: s.id } })}
      onCancel={() => router.back()}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: colors.paper[50],
      }}
    >
      {children}
    </View>
  );
}
