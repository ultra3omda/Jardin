import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { colors } from '@klasso/ui-mobile';
import { StudentForm } from '@/components/students/student-form';
import { useAuthStore } from '@/lib/auth/store';

/**
 * Création d'un élève (admin uniquement). Les autres rôles n'arrivent jamais
 * ici (le FAB n'est rendu que pour SCHOOL_ADMIN) mais on garde un garde-fou.
 */
export default function NewStudentScreen() {
  const role = useAuthStore((s) => s.user?.role);

  if (role !== 'SCHOOL_ADMIN') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: colors.ink[500], textAlign: 'center' }}>
          Seule la direction peut ajouter un élève.
        </Text>
      </View>
    );
  }

  return (
    <StudentForm
      mode="create"
      onSuccess={(s) => router.replace({ pathname: '/(app)/students/[id]', params: { id: s.id } })}
      onCancel={() => router.back()}
    />
  );
}
