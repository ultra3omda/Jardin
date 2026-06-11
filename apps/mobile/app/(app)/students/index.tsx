import { useQuery } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@klasso/ui-mobile';
import { listStudents, type StudentSummary } from '@/lib/api/students';
import { useMyChildren } from '@/lib/api/parent';
import { useAuthStore } from '@/lib/auth/store';

/**
 * V2 — Mobile : liste élèves (admin/enseignant/staff) ; pour le PARENT, on
 * affiche ses enfants via /students/my-children (le filtre parentEmail du
 * endpoint liste n'est pas fiable pour les comptes de démo).
 */
function Initials({ s }: { s: StudentSummary }) {
  return (
    <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-200">
      <Text className="text-xs font-semibold text-gray-700">
        {(s.firstName[0] ?? '') + (s.lastName[0] ?? '')}
      </Text>
    </View>
  );
}

export default function StudentsListScreen() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'PARENT') return <MyChildrenScreen />;
  return <StaffStudentsScreen isAdmin={role === 'SCHOOL_ADMIN'} />;
}

function MyChildrenScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, error } = useMyChildren();
  const kids = data ?? [];
  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-200 p-4" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-2xl font-bold">Mon enfant</Text>
      </View>
      {isLoading ? (
        <Text className="p-4 text-gray-500">Chargement…</Text>
      ) : error ? (
        <Text className="p-4 text-rose-600">Erreur : {(error as Error).message}</Text>
      ) : kids.length === 0 ? (
        <Text className="p-4 text-gray-500">Aucun enfant rattaché à votre compte.</Text>
      ) : (
        <FlatList
          data={kids}
          keyExtractor={(c) => c.id}
          ItemSeparatorComponent={() => <View className="h-px bg-gray-100" />}
          renderItem={({ item }) => (
            <Link href={{ pathname: '/(app)/students/[id]', params: { id: item.id } }} asChild>
              <View
                className="flex-row items-center gap-3 p-4"
                accessibilityRole="link"
                accessibilityLabel={`${item.firstName} ${item.lastName}, classe ${item.className ?? ''}`}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                  <Text className="text-xs font-semibold text-gray-700">
                    {(item.firstName[0] ?? '') + (item.lastName[0] ?? '')}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium">
                    {item.lastName} {item.firstName}
                  </Text>
                  <Text className="text-sm text-gray-500">{item.className ?? 'Classe non assignée'}</Text>
                </View>
              </View>
            </Link>
          )}
        />
      )}
    </View>
  );
}

function StaffStudentsScreen({ isAdmin }: { isAdmin: boolean }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['students', search],
    queryFn: () =>
      listStudents({ pageSize: 50, search: search.trim() || undefined }),
  });

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-200 p-4" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-2xl font-bold">Élèves</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher…"
          className="mt-2 h-10 rounded-md border border-gray-300 px-3"
          accessibilityLabel="Rechercher un élève"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isLoading ? (
        <Text className="p-4 text-gray-500" accessibilityRole="alert">
          Chargement…
        </Text>
      ) : error ? (
        <Text className="p-4 text-rose-600" accessibilityRole="alert">
          Erreur : {(error as Error).message}
        </Text>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(s) => s.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ItemSeparatorComponent={() => <View className="h-px bg-gray-100" />}
          ListEmptyComponent={
            <Text className="p-4 text-gray-500">
              {search ? `Aucun résultat pour « ${search} ».` : 'Aucun élève.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Link
              href={{ pathname: '/(app)/students/[id]', params: { id: item.id } }}
              asChild
            >
              <View
                className="flex-row items-center gap-3 p-4"
                accessibilityRole="link"
                accessibilityLabel={`${item.firstName} ${item.lastName}, classe ${item.classroom}`}
              >
                <Initials s={item} />
                <View className="flex-1">
                  <Text className="text-base font-medium">
                    {item.lastName} {item.firstName}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {item.classroom} · {item.parentEmail}
                  </Text>
                </View>
              </View>
            </Link>
          )}
        />
      )}

      {isAdmin ? (
        <Fab
          label="Ajouter un élève"
          extended
          onPress={() => router.push('/(app)/students/new')}
        />
      ) : null}
    </View>
  );
}
