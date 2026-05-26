import { CreateStudentForm } from './create-student-form';

/**
 * V2 — Module Élèves : page création `/students/new`.
 * Server component minimal. Le formulaire sectionné est un client component.
 */
export const dynamic = 'force-dynamic';

export default function NewStudentPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Nouvel élève</h1>
        <p className="text-sm text-muted-foreground">
          Création d&apos;une fiche élève complète (15 champs).
        </p>
      </header>
      <CreateStudentForm />
    </div>
  );
}
