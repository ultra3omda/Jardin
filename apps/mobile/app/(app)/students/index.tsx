import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, Text, TextInput, View } from 'react-native';

import { listStudents, type StudentSummary } from '@/lib/api/students';

/**
 * V2 — Mobile : liste élèves read-only (toutes personas).
 * Filtré côté serveur par RBAC (PARENT scope par parentEmail).
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
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['students', search],
    queryFn: () =>
      listStudents({ pageSize: 50, search: search.trim() || undefined }),
  });

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-200 p-4">
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
    </View>
  );
}
