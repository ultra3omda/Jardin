import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius } from '@klasso/ui-mobile';
import {
  canDownloadBulletin,
  downloadBulletinPdf,
  useMyChildrenBulletins,
  type ChildBulletinEntry,
  type ChildBulletins,
} from '@/lib/api/bulletins';

/**
 * Section « Bulletins officiels (PDF) » pour les parents : liste les bulletins
 * générés par l'école, téléchargeables (web). Masquée s'il n'y en a aucun.
 */
export function BulletinDownloads() {
  const { data, isLoading } = useMyChildrenBulletins();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const children = (data ?? []).filter((c) => c.bulletins.length > 0);
  if (isLoading || children.length === 0) return null;

  async function download(c: ChildBulletins, b: ChildBulletinEntry) {
    const key = `${c.studentId}:${b.gradePeriodId}`;
    setBusy(key);
    setError(null);
    try {
      await downloadBulletinPdf(
        c.studentId,
        b.gradePeriodId,
        `bulletin_${c.studentName}_${b.gradePeriodName}.pdf`.replace(/\s+/g, '_'),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Téléchargement impossible.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View
      style={{
        marginTop: 8,
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.paper[100],
        padding: 14,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900], marginBottom: 10 }}>
        Bulletins officiels (PDF)
      </Text>

      {children.map((c) => (
        <View key={c.studentId} style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: 4 }}>
            {c.studentName}
          </Text>
          {c.bulletins.map((b) => {
            const key = `${c.studentId}:${b.gradePeriodId}`;
            const downloading = busy === key;
            if (!canDownloadBulletin) {
              return (
                <Text key={b.gradePeriodId} style={{ fontSize: 13, color: colors.ink[300], paddingVertical: 6 }}>
                  {b.gradePeriodName} ({b.schoolYear}) — téléchargeable sur l&apos;app web
                </Text>
              );
            }
            return (
              <Pressable
                key={b.gradePeriodId}
                onPress={() => download(c, b)}
                disabled={downloading}
                accessibilityRole="button"
                accessibilityLabel={`Télécharger le bulletin ${b.gradePeriodName} de ${c.studentName}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 8,
                }}
              >
                <Ionicons name="download-outline" size={18} color={colors.ambre[600]} />
                <Text style={{ flex: 1, fontSize: 14, color: colors.ink[900] }}>
                  {b.gradePeriodName} ({b.schoolYear})
                </Text>
                {downloading ? <ActivityIndicator size="small" color={colors.ambre[500]} /> : null}
              </Pressable>
            );
          })}
        </View>
      ))}

      {error ? (
        <Text style={{ fontSize: 13, color: colors.status.danger500, marginTop: 4 }}>{error}</Text>
      ) : null}
    </View>
  );
}
