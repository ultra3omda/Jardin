import React from 'react';

// NOTE: `@react-pdf/renderer` v4 is pure ESM and cannot be statically imported
// from this CJS-compiled NestJS code. Primitives + StyleSheet are passed in by
// the caller (BulletinPdfService) after a dynamic import().

export interface BulletinSubjectEntry {
  subjectId: string;
  subjectName: string;
  grades: Array<{
    evalTitle: string;
    date: string;
    score: number;
    maxScore: number;
    scaledScore: number;
  }>;
  average: number | null;
}

export interface BulletinDocumentProps {
  schoolName: string;
  studentFirstName: string;
  studentLastName: string;
  studentClassroom: string;
  periodName: string;
  schoolYear: string;
  subjects: BulletinSubjectEntry[];
  overallAverage: number | null;
  generatedAt: string;
}

// Minimal structural typing of the @react-pdf/renderer primitives we use,
// so this file has no runtime dependency on the package.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Primitive = React.ComponentType<any>;
export interface ReactPdfPrimitives {
  Document: Primitive;
  Page: Primitive;
  View: Primitive;
  Text: Primitive;
  StyleSheet: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: <T extends Record<string, any>>(styles: T) => T;
  };
}

function formatAverage(v: number | null): string {
  return v === null ? '—' : v.toFixed(2);
}

/**
 * Build the React element tree for a bulletin PDF.
 * Caller (BulletinPdfService) injects the @react-pdf/renderer primitives
 * after a runtime `await import('@react-pdf/renderer')`.
 */
export function buildBulletinDocument(
  primitives: ReactPdfPrimitives,
  props: BulletinDocumentProps,
): React.ReactElement {
  const { Document, Page, View, Text, StyleSheet } = primitives;
  const {
    schoolName,
    studentFirstName,
    studentLastName,
    studentClassroom,
    periodName,
    schoolYear,
    subjects,
    overallAverage,
    generatedAt,
  } = props;

  const styles = StyleSheet.create({
    page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottom: '2px solid #1a1a1a',
      paddingBottom: 10,
      marginBottom: 20,
    },
    schoolName: { fontSize: 18, fontWeight: 700 },
    periodLabel: { fontSize: 12, color: '#555' },
    studentBlock: {
      marginBottom: 18,
      padding: 12,
      backgroundColor: '#f4f4f4',
      borderRadius: 4,
    },
    studentName: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
    studentMeta: { fontSize: 10, color: '#555' },
    subjectsHeading: { fontSize: 13, fontWeight: 700, marginBottom: 10 },
    table: { width: '100%' },
    tableRowHeader: {
      flexDirection: 'row',
      backgroundColor: '#e9e9e9',
      padding: 6,
      borderBottom: '1px solid #ccc',
    },
    tableRow: {
      flexDirection: 'row',
      padding: 6,
      borderBottom: '1px solid #eee',
    },
    colSubject: { width: '40%' },
    colAvg: { width: '20%', textAlign: 'right' },
    colCount: { width: '20%', textAlign: 'right' },
    colDetails: { width: '20%', textAlign: 'right' },
    bold: { fontWeight: 700 },
    overallBlock: {
      marginTop: 24,
      padding: 14,
      backgroundColor: '#1a1a1a',
      color: '#fff',
      borderRadius: 4,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    overallLabel: { fontSize: 12 },
    overallValue: { fontSize: 20, fontWeight: 700 },
    footer: {
      position: 'absolute',
      bottom: 24,
      left: 36,
      right: 36,
      fontSize: 8,
      color: '#888',
      textAlign: 'center',
    },
    emptyNotice: {
      padding: 16,
      backgroundColor: '#fff4cc',
      border: '1px solid #d4b800',
      borderRadius: 4,
      marginTop: 12,
    },
  });

  const e = React.createElement;
  const subjectsBody =
    subjects.length === 0
      ? e(
          View,
          { style: styles.emptyNotice },
          e(Text, null, 'Aucune note enregistrée pour cette période.'),
        )
      : e(
          View,
          { style: styles.table },
          e(
            View,
            { style: styles.tableRowHeader },
            e(Text, { style: [styles.colSubject, styles.bold] }, 'Matière'),
            e(Text, { style: [styles.colAvg, styles.bold] }, 'Moyenne /20'),
            e(Text, { style: [styles.colCount, styles.bold] }, 'Notes'),
            e(Text, { style: [styles.colDetails, styles.bold] }, 'Détails'),
          ),
          ...subjects.map((s) =>
            e(
              View,
              { key: s.subjectId, style: styles.tableRow },
              e(Text, { style: styles.colSubject }, s.subjectName),
              e(Text, { style: [styles.colAvg, styles.bold] }, formatAverage(s.average)),
              e(Text, { style: styles.colCount }, String(s.grades.length)),
              e(
                Text,
                { style: styles.colDetails },
                s.grades.map((g) => g.scaledScore.toFixed(1)).join(' · '),
              ),
            ),
          ),
        );

  return e(
    Document,
    {
      title: `Bulletin ${studentLastName} ${studentFirstName} — ${periodName} ${schoolYear}`,
      author: schoolName,
    },
    e(
      Page,
      { size: 'A4', style: styles.page },
      e(
        View,
        { style: styles.header },
        e(
          View,
          null,
          e(Text, { style: styles.schoolName }, schoolName),
          e(Text, { style: styles.periodLabel }, 'Bulletin scolaire'),
        ),
        e(
          View,
          null,
          e(Text, { style: styles.periodLabel }, `${periodName} — ${schoolYear}`),
        ),
      ),
      e(
        View,
        { style: styles.studentBlock },
        e(
          Text,
          { style: styles.studentName },
          `${studentLastName.toUpperCase()} ${studentFirstName}`,
        ),
        e(Text, { style: styles.studentMeta }, `Classe : ${studentClassroom}`),
      ),
      e(Text, { style: styles.subjectsHeading }, 'Résultats par matière'),
      subjectsBody,
      e(
        View,
        { style: styles.overallBlock },
        e(Text, { style: styles.overallLabel }, 'Moyenne générale'),
        e(
          Text,
          { style: styles.overallValue },
          `${formatAverage(overallAverage)} / 20`,
        ),
      ),
      e(
        Text,
        { style: styles.footer },
        `Généré le ${new Date(generatedAt).toLocaleString('fr-FR')} — Klasso`,
      ),
    ),
  );
}
