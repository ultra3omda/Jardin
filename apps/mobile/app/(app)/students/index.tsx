import { useQuery } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, Fab, colors, fonts, radius } from '@klasso/ui-mobile';
import { listStudents } from '@/lib/api/students';
import { useMyChildren } from '@/lib/api/parent';
import { useAuthStore } from '@/lib/auth/store';

/**
 * V7 — Liste élèves. Admin/enseignant/staff voient tous les élèves (recherche),
 * le PARENT voit ses enfants via /students/my-children (le filtre parentEmail
 * du endpoint liste n'est pas fiable pour les comptes démo).
 */

function Avatar({ first, last }: { first: string; last: string }) {
  return (
    <View
      style={{
        height: 44,
        width: 44,
        borderRadius: 22,
        backgroundColor: colors.navy[900],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.white, fontSize: 14, fontFamily: fonts.bodySemibold }}>
        {((first[0] ?? '') + (last[0] ?? '')).toUpperCase()}
      </Text>
    </View>
  );
}

function StudentRow({
  id,
  first,
  last,
  subtitle,
}: {
  id: string;
  first: string;
  last: string;
  subtitle: string;
}) {
  return (
    <Link href={{ pathname: '/(app)/students/[id]', params: { id } }} asChild>
      <View
        accessibilityRole="link"
        accessibilityLabel={`${first} ${last}, ${subtitle}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 12,
          marginBottom: 10,
        }}
      >
        <Avatar first={first} last={last} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontFamily: fonts.bodySemibold, color: colors.ink[900] }}>
            {last} {first}
          </Text>
          <Text
            style={{ fontSize: 12, color: colors.ink[500], marginTop: 2, fontFamily: fonts.body }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    </Link>
  );
}

function ScreenTitle({ children }: { children: string }) {
  return (
    <Text
      style={{ fontSize: 24, fontFamily: fonts.displayBold, color: colors.ink[900], marginBottom: 16 }}
    >
      {children}
    </Text>
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
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <FlatList
        data={kids}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 32 }}
        ListHeaderComponent={<ScreenTitle>Mon enfant</ScreenTitle>}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 32 }} />
          ) : error ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Erreur"
              description={(error as Error).message}
            />
          ) : (
            <EmptyState
              icon="happy-outline"
              title="Aucun enfant"
              description="Aucun enfant rattaché à votre compte."
            />
          )
        }
        renderItem={({ item }) => (
          <StudentRow
            id={item.id}
            first={item.firstName}
            last={item.lastName}
            subtitle={item.className ?? 'Classe non assignée'}
          />
        )}
      />
    </View>
  );
}

function StaffStudentsScreen({ isAdmin }: { isAdmin: boolean }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['students', search],
    queryFn: () => listStudents({ pageSize: 50, search: search.trim() || undefined }),
  });
  const items = data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
      <FlatList
        data={items}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.ambre[500]}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 24,
                fontFamily: fonts.displayBold,
                color: colors.ink[900],
                marginBottom: 12,
              }}
            >
              Élèves
            </Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher…"
              placeholderTextColor={colors.ink[300]}
              accessibilityLabel="Rechercher un élève"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: colors.ink[900],
                borderWidth: 1,
                borderColor: colors.line,
                fontFamily: fonts.body,
              }}
            />
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 32 }} />
          ) : error ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Erreur"
              description={(error as Error).message}
            />
          ) : (
            <EmptyState
              icon="people-outline"
              title={search ? 'Aucun résultat' : 'Aucun élève'}
              description={search ? `Aucun résultat pour « ${search} ».` : undefined}
            />
          )
        }
        renderItem={({ item }) => (
          <StudentRow
            id={item.id}
            first={item.firstName}
            last={item.lastName}
            subtitle={`${item.classroom} · ${item.parentEmail}`}
          />
        )}
      />
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
