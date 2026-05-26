import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import React from 'react';

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

function formatAverage(v: number | null): string {
  return v === null ? '—' : v.toFixed(2);
}

export const BulletinDocument: React.FC<BulletinDocumentProps> = ({
  schoolName,
  studentFirstName,
  studentLastName,
  studentClassroom,
  periodName,
  schoolYear,
  subjects,
  overallAverage,
  generatedAt,
}) => (
  <Document
    title={`Bulletin ${studentLastName} ${studentFirstName} — ${periodName} ${schoolYear}`}
    author={schoolName}
  >
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.schoolName}>{schoolName}</Text>
          <Text style={styles.periodLabel}>Bulletin scolaire</Text>
        </View>
        <View>
          <Text style={styles.periodLabel}>{periodName} — {schoolYear}</Text>
        </View>
      </View>

      <View style={styles.studentBlock}>
        <Text style={styles.studentName}>{studentLastName.toUpperCase()} {studentFirstName}</Text>
        <Text style={styles.studentMeta}>Classe : {studentClassroom}</Text>
      </View>

      <Text style={styles.subjectsHeading}>Résultats par matière</Text>

      {subjects.length === 0 ? (
        <View style={styles.emptyNotice}>
          <Text>Aucune note enregistrée pour cette période.</Text>
        </View>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableRowHeader}>
            <Text style={[styles.colSubject, styles.bold]}>Matière</Text>
            <Text style={[styles.colAvg, styles.bold]}>Moyenne /20</Text>
            <Text style={[styles.colCount, styles.bold]}>Notes</Text>
            <Text style={[styles.colDetails, styles.bold]}>Détails</Text>
          </View>
          {subjects.map((s) => (
            <View key={s.subjectId} style={styles.tableRow}>
              <Text style={styles.colSubject}>{s.subjectName}</Text>
              <Text style={[styles.colAvg, styles.bold]}>{formatAverage(s.average)}</Text>
              <Text style={styles.colCount}>{s.grades.length}</Text>
              <Text style={styles.colDetails}>
                {s.grades.map((g) => g.scaledScore.toFixed(1)).join(' · ')}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.overallBlock}>
        <Text style={styles.overallLabel}>Moyenne générale</Text>
        <Text style={styles.overallValue}>{formatAverage(overallAverage)} / 20</Text>
      </View>

      <Text style={styles.footer}>
        Généré le {new Date(generatedAt).toLocaleString('fr-FR')} — Klasso
      </Text>
    </Page>
  </Document>
);
