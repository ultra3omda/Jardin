'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CrudModal } from '@/components/crud/crud-modal';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { requireToken } from '@/lib/auth/require-token';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useToast } from '@/lib/ui/use-toast';
import {
  downloadActivityReportPdf,
  uploadReportPhoto,
  useActivityReport,
  useUpsertActivityReport,
  type ActivityReport,
} from '@/lib/api/activity-reports';
import {
  activityReportSchema,
  type ActivityReportValues,
} from '@/lib/validation/activity-reports.schemas';

const TEXTAREA_CLASS =
  'flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function toFormValues(report: ActivityReport | null): ActivityReportValues {
  return {
    title: report?.title ?? '',
    summary: report?.summary ?? '',
    visibleToParent: report?.visibleToParent ?? true,
  };
}

interface Props {
  activity: { id: string; name: string };
  onClose: () => void;
}

/** Editor for an activity's report (compte rendu) + PDF download. */
export function ActivityReportModal({ activity, onClose }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useActivityReport(activity.id);
  const report = data ?? null;

  const upsertMut = useUpsertActivityReport(activity.id);

  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const reportPhotos = useMemo(() => report?.photoUrls ?? [], [report?.photoUrls]);

  // Sync local photo state once the report loads.
  useEffect(() => {
    setPhotoUrls(reportPhotos);
  }, [reportPhotos]);

  const form = useForm<ActivityReportValues>({
    resolver: zodResolver(activityReportSchema),
    values: toFormValues(report),
  });

  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  const onSubmit = (values: ActivityReportValues) => {
    upsertMut.mutate(
      { ...values, photoUrls },
      {
        onSuccess: () => toast.success('Rapport enregistré.'),
        onError: (err) => toast.error(errMsg(err, 'Enregistrement impossible.')),
      },
    );
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const token = requireToken(accessToken);
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadReportPhoto(token, activity.id, file));
      }
      setPhotoUrls((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} photo(s) ajoutée(s).`);
    } catch (err) {
      toast.error(errMsg(err, 'Envoi des photos impossible.'));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url: string) => {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadActivityReportPdf(requireToken(accessToken), activity.id);
    } catch (err) {
      toast.error(errMsg(err, 'Téléchargement du PDF impossible.'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <CrudModal open title={`Rapport — ${activity.name}`} onClose={onClose}>
      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chargement du rapport…</p>
      ) : isError ? (
        <div className="space-y-3 py-6 text-center">
          <p className="text-sm text-rose-600">Impossible de charger le rapport.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {report && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ambre-200 bg-ambre-50 p-3">
              <p className="text-xs text-muted-foreground">
                Rapport généré — vous pouvez le télécharger ou le mettre à jour.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? 'Préparation…' : 'Télécharger le PDF'}
              </Button>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre</FormLabel>
                    <FormControl>
                      <Input placeholder="Sortie au musée" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Résumé</FormLabel>
                    <FormControl>
                      <textarea
                        className={TEXTAREA_CLASS}
                        placeholder="Déroulé de l'activité, temps forts, observations…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <section className="space-y-2">
                <p className="text-sm font-medium text-navy-900">Photos</p>
                {photoUrls.length > 0 ? (
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {photoUrls.map((url) => (
                      <li
                        key={url}
                        className="group relative overflow-hidden rounded-md border bg-muted/30"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Photo du rapport"
                          className="aspect-square w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(url)}
                          className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                          aria-label="Retirer la photo"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucune photo ajoutée.</p>
                )}
                <div>
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium ring-offset-background hover:bg-muted/40 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      disabled={uploading}
                      onChange={(e) => {
                        void handleFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    {uploading ? 'Envoi…' : 'Ajouter des photos'}
                  </label>
                </div>
              </section>

              <FormField
                control={form.control}
                name="visibleToParent"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex items-center gap-2 text-sm text-navy-900">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      Visible par les parents
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={upsertMut.isPending}>
                  Fermer
                </Button>
                <Button type="submit" disabled={upsertMut.isPending || uploading}>
                  {upsertMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </CrudModal>
  );
}
