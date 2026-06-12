import React from 'react';

// NOTE: `@react-pdf/renderer` v4 is pure ESM and cannot be statically imported
// from this CJS-compiled NestJS code. Primitives are injected by the caller
// (ActivityReportPdfService) after a dynamic import(). Mirrors bulletin-document.

export interface ActivityReportProps {
  schoolName: string;
  activityName: string;
  date: string; // ISO or empty
  title: string;
  summary: string;
  photoUrls: string[];
  participants: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Primitive = React.ComponentType<any>;
export interface ReactPdfPrimitives {
  Document: Primitive;
  Page: Primitive;
  View: Primitive;
  Text: Primitive;
  Image: Primitive;
  StyleSheet: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: <T extends Record<string, any>>(styles: T) => T;
  };
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR');
}

/**
 * Build the React element tree for an activity report PDF.
 * Caller injects the @react-pdf/renderer primitives after a runtime import().
 */
export function buildActivityReportDocument(
  primitives: ReactPdfPrimitives,
  props: ActivityReportProps,
): React.ReactElement {
  const { Document, Page, View, Text, Image, StyleSheet } = primitives;
  const { schoolName, activityName, date, title, summary, photoUrls, participants } = props;

  const styles = StyleSheet.create({
    page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
    header: { marginBottom: 16, borderBottom: '2 solid #c1462f', paddingBottom: 8 },
    school: { fontSize: 9, color: '#6b6b6b' },
    activity: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 2, color: '#1f3a5f' },
    date: { fontSize: 9, color: '#6b6b6b', marginTop: 2 },
    title: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 4 },
    summary: { fontSize: 10, lineHeight: 1.5, marginBottom: 12 },
    sectionTitle: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      marginTop: 10,
      marginBottom: 6,
      color: '#1f3a5f',
    },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    photo: { width: 160, height: 120, margin: 4, objectFit: 'cover', borderRadius: 4 },
    participant: { fontSize: 9, marginBottom: 2 },
    footer: { position: 'absolute', bottom: 24, left: 36, right: 36, fontSize: 8, color: '#9a9a9a' },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.school}>{schoolName}</Text>
          <Text style={styles.activity}>{activityName}</Text>
          {formatDate(date) ? <Text style={styles.date}>{formatDate(date)}</Text> : null}
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.summary}>{summary}</Text>

        {photoUrls.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.photoGrid}>
              {photoUrls.map((url, i) => (
                <Image key={i} src={url} style={styles.photo} />
              ))}
            </View>
          </View>
        ) : null}

        {participants.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Participants ({participants.length})</Text>
            {participants.map((name, i) => (
              <Text key={i} style={styles.participant}>
                • {name}
              </Text>
            ))}
          </View>
        ) : null}

        <Text style={styles.footer}>Généré par Klasso</Text>
      </Page>
    </Document>
  );
}
