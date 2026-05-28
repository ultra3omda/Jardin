'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function AdminBrandingPage() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    platformName: 'Klasso',
    tagline: 'La plateforme de gestion scolaire nouvelle génération',
    primaryColor: '#F59E0B',
    supportEmail: 'support@klasso.tn',
    termsUrl: 'https://klasso.tn/cgu',
    privacyUrl: 'https://klasso.tn/confidentialite',
    defaultLocale: 'fr',
    maintenanceMode: false,
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Apparence globale</h1>
        <p className="text-sm text-muted-foreground">Paramètres de marque de la plateforme Klasso.</p>
      </header>

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Paramètres enregistrés.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-navy-900">Identité de marque</h2>
          <div>
            <label className="mb-1 block text-sm font-medium">Nom de la plateforme</label>
            <input className="w-full rounded-md border px-3 py-2 text-sm" value={form.platformName}
              onChange={(e) => setForm((p) => ({ ...p, platformName: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Slogan</label>
            <input className="w-full rounded-md border px-3 py-2 text-sm" value={form.tagline}
              onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))} />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Couleur principale</label>
              <div className="flex items-center gap-2">
                <input type="color" className="h-9 w-14 cursor-pointer rounded border p-0.5" value={form.primaryColor}
                  onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))} />
                <span className="font-mono text-sm text-muted-foreground">{form.primaryColor}</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Langue par défaut</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.defaultLocale}
                onChange={(e) => setForm((p) => ({ ...p, defaultLocale: e.target.value }))}>
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-navy-900">Liens légaux &amp; support</h2>
          <div>
            <label className="mb-1 block text-sm font-medium">Email support</label>
            <input type="email" className="w-full rounded-md border px-3 py-2 text-sm" value={form.supportEmail}
              onChange={(e) => setForm((p) => ({ ...p, supportEmail: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">URL CGU</label>
              <input className="w-full rounded-md border px-3 py-2 text-sm" value={form.termsUrl}
                onChange={(e) => setForm((p) => ({ ...p, termsUrl: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">URL Confidentialité</label>
              <input className="w-full rounded-md border px-3 py-2 text-sm" value={form.privacyUrl}
                onChange={(e) => setForm((p) => ({ ...p, privacyUrl: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-navy-900">Mode maintenance</p>
              <p className="text-xs text-muted-foreground">Affiche une page de maintenance aux utilisateurs.</p>
            </div>
            <button type="button" role="switch" aria-checked={form.maintenanceMode}
              onClick={() => setForm((p) => ({ ...p, maintenanceMode: !p.maintenanceMode }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.maintenanceMode ? 'bg-red-500' : 'bg-slate-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="rounded-md bg-ambre-500 hover:bg-ambre-600 px-6 py-2 text-sm font-medium text-white">
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
