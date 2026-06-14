import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';

import { Button, EmptyState, Picker, colors, radius, type PickerOption } from '@klasso/ui-mobile';
import {
  canUploadImports,
  pickImportFile,
  runImport,
  useImportEntities,
  type ImportResult,
} from '@/lib/api/imports';

export default function ManageImportsScreen() {
  const { data: entities, isLoading } = useImportEntities();
  const [entityId, setEntityId] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-undef
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  const options: PickerOption[] = (entities ?? []).map((e) => ({ value: e.id, label: e.label }));

  const dryRunM = useMutation({
    mutationFn: () => runImport(entityId, file!, true),
    onSuccess: (r) => setResult(r),
  });
  const importM = useMutation({
    mutationFn: () => runImport(entityId, file!, false),
    onSuccess: (r) => setResult(r),
  });

  async function choose() {
    const f = await pickImportFile();
    if (f) {
      setFile(f);
      setFileName(f.name);
      setResult(null);
    }
  }

  if (!canUploadImports) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper[50] }}>
        <EmptyState
          icon="cloud-upload-outline"
          title="Imports depuis l'app web"
          description="L'import de fichiers CSV/Excel se fait depuis le back-office web pour le moment."
        />
      </View>
    );
  }

  const busy = dryRunM.isPending || importM.isPending;
  const canCheck = !!entityId && !!file && !busy;
  const canImport = !!result && result.dryRun && result.valid > 0 && !busy;
  const err = (dryRunM.error || importM.error) as Error | null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper[50] }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 16 }}>
        Importez des données en masse (élèves, classes…) depuis un fichier CSV ou Excel. Une
        vérification (sans écriture) est faite avant l'import définitif.
      </Text>

      {isLoading ? (
        <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
      ) : (
        <>
          <Picker
            label="Type de données"
            required
            value={entityId}
            onChange={(v) => {
              setEntityId(v);
              setResult(null);
            }}
            options={options}
            placeholder={options.length ? 'Choisir…' : 'Aucun type disponible'}
            disabled={options.length === 0}
          />

          <View style={{ marginTop: 8, marginBottom: 4 }}>
            <Button label={fileName ? `Fichier : ${fileName}` : 'Choisir un fichier'} variant="secondary" onPress={choose} />
          </View>

          <Button label="Vérifier le fichier" onPress={() => dryRunM.mutate()} loading={dryRunM.isPending} disabled={!canCheck} />

          {result ? (
            <View
              style={{
                marginTop: 16,
                backgroundColor: colors.white,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.paper[100],
                padding: 14,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink[900] }}>
                {result.dryRun ? 'Vérification' : 'Import terminé'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.ink[700], marginTop: 6 }}>
                {result.total} ligne(s) · {result.valid} valide(s)
                {result.dryRun ? '' : ` · ${result.imported} importée(s)`}
              </Text>
              {result.errors.length > 0 ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.status.danger500 }}>
                    {result.errors.length} erreur(s) :
                  </Text>
                  {result.errors.slice(0, 20).map((e, i) => (
                    <Text key={i} style={{ fontSize: 12, color: colors.ink[500], marginTop: 2 }}>
                      Ligne {e.row} : {e.message}
                    </Text>
                  ))}
                </View>
              ) : null}

              {canImport ? (
                <View style={{ marginTop: 12 }}>
                  <Button
                    label={`Importer ${result.valid} ligne(s)`}
                    onPress={() => importM.mutate()}
                    loading={importM.isPending}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {err ? (
            <Text style={{ fontSize: 13, color: colors.status.danger500, marginTop: 12 }}>
              Erreur : {err.message}
            </Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
