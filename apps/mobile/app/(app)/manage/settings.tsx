import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, FormField, colors, radius } from '@klasso/ui-mobile';
import { BRANDING_KEY, getBranding, updateBranding, type BrandColors } from '@/lib/api/branding';
import { useTenantStore } from '@/lib/tenant/store';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const COLOR_FIELDS: { key: keyof BrandColors; label: string }[] = [
  { key: 'primaryColor', label: 'Couleur principale' },
  { key: 'primaryHover', label: 'Couleur principale (survol)' },
  { key: 'secondaryColor', label: 'Couleur secondaire' },
  { key: 'emailHeaderColor', label: 'En-tête des emails' },
];

export default function ManageSettingsScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: BRANDING_KEY, queryFn: getBranding });
  const tenantName = useTenantStore((s) => s.name);
  const tenantSlug = useTenantStore((s) => s.slug);

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setValues({
      primaryColor: data.primaryColor ?? '',
      primaryHover: data.primaryHover ?? '',
      secondaryColor: data.secondaryColor ?? '',
      emailHeaderColor: data.emailHeaderColor ?? '',
    });
  }, [data]);

  const saveM = useMutation({
    mutationFn: () => {
      const payload: BrandColors = {};
      for (const { key } of COLOR_FIELDS) {
        const v = values[key as string];
        if (v) payload[key] = v;
      }
      return updateBranding(payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BRANDING_KEY });
      setSaved(true);
    },
  });

  function submit() {
    const e: Record<string, string> = {};
    for (const { key } of COLOR_FIELDS) {
      const v = values[key as string];
      if (v && !HEX_RE.test(v)) e[key as string] = 'Format #RRGGBB';
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaved(false);
    saveM.mutate();
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper[50], justifyContent: 'center' }}>
        <ActivityIndicator color={colors.ambre[500]} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper[50] }} contentContainerStyle={{ padding: 16 }}>
      {/* Établissement (lecture seule) */}
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.paper[100],
          padding: 14,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 12, color: colors.ink[500] }}>Établissement</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink[900], marginTop: 2 }}>
          {tenantName ?? '—'}
        </Text>
        {tenantSlug ? (
          <Text style={{ fontSize: 12, color: colors.ink[300], marginTop: 2 }}>code : {tenantSlug}</Text>
        ) : null}
      </View>

      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink[900], marginBottom: 8 }}>
        Couleurs (white-label)
      </Text>

      {isError ? (
        <Text style={{ color: colors.status.danger500, marginBottom: 12 }}>Erreur de chargement.</Text>
      ) : null}

      {COLOR_FIELDS.map(({ key, label }) => {
        const v = values[key as string] ?? '';
        return (
          <View key={key as string} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <FormField
                label={label}
                value={v}
                onChangeText={(t) => setValues((prev) => ({ ...prev, [key]: t }))}
                error={errors[key as string]}
                placeholder="#4f46e5"
                autoCapitalize="none"
              />
            </View>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: colors.paper[100],
                backgroundColor: HEX_RE.test(v) ? v : colors.paper[100],
              }}
            />
          </View>
        );
      })}

      {saveM.error ? (
        <Text style={{ fontSize: 13, color: colors.status.danger500, marginTop: 4 }}>
          Erreur : {(saveM.error as Error).message}
        </Text>
      ) : null}
      {saved ? (
        <Text style={{ fontSize: 13, color: '#16a34a', marginTop: 4 }}>
          Enregistré. Les couleurs s&apos;appliqueront à la prochaine connexion.
        </Text>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <Button label="Enregistrer les couleurs" onPress={submit} loading={saveM.isPending} />
      </View>
    </ScrollView>
  );
}
