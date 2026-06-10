import React from 'react';

// Like the bulletin template, this builds the React element tree with
// React.createElement (no JSX) and receives the @react-pdf/renderer primitives
// from the caller after a runtime dynamic import — so the file has no static
// dependency on the ESM-only package and no JSX-runtime coupling.

export interface InvoiceLineItem {
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceDocumentProps {
  schoolName: string;
  invoiceNumber: string;
  title: string;
  statusLabel: string;
  currency: string;
  issueDate: string; // ISO
  dueDate: string; // ISO
  billedToName: string | null;
  items: InvoiceLineItem[];
  total: number;
  paidTotal: number;
  balance: number;
  notes: string | null;
  generatedAt: string; // ISO
}

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

function money(v: number, currency: string): string {
  return `${v.toFixed(3)} ${currency}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

/**
 * Build the React element tree for an invoice PDF. The caller
 * (InvoicePdfService) injects the @react-pdf/renderer primitives after a
 * runtime `await import('@react-pdf/renderer')`.
 */
export function buildInvoiceDocument(
  primitives: ReactPdfPrimitives,
  props: InvoiceDocumentProps,
): React.ReactElement {
  const { Document, Page, View, Text, StyleSheet } = primitives;
  const {
    schoolName,
    invoiceNumber,
    title,
    statusLabel,
    currency,
    issueDate,
    dueDate,
    billedToName,
    items,
    total,
    paidTotal,
    balance,
    notes,
    generatedAt,
  } = props;

  const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottom: '2px solid #14213d',
      paddingBottom: 12,
      marginBottom: 22,
    },
    schoolName: { fontSize: 18, fontWeight: 700, color: '#14213d' },
    docLabel: { fontSize: 22, fontWeight: 700, color: '#14213d', textAlign: 'right' },
    docMeta: { fontSize: 9, color: '#666', textAlign: 'right', marginTop: 4 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    metaBlock: { width: '48%' },
    metaTitle: { fontSize: 8, color: '#888', textTransform: 'uppercase', marginBottom: 3 },
    metaValue: { fontSize: 11, fontWeight: 700 },
    statusPill: {
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 3,
      backgroundColor: '#e9e9e9',
      fontSize: 9,
      fontWeight: 700,
    },
    table: { width: '100%', marginTop: 6 },
    tableRowHeader: {
      flexDirection: 'row',
      backgroundColor: '#14213d',
      color: '#fff',
      padding: 7,
    },
    tableRow: { flexDirection: 'row', padding: 7, borderBottom: '1px solid #eee' },
    colLabel: { width: '46%' },
    colQty: { width: '14%', textAlign: 'right' },
    colUnit: { width: '20%', textAlign: 'right' },
    colAmount: { width: '20%', textAlign: 'right' },
    bold: { fontWeight: 700 },
    totals: { marginTop: 16, alignItems: 'flex-end' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', width: '45%', paddingVertical: 2 },
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '45%',
      marginTop: 6,
      paddingTop: 6,
      paddingBottom: 6,
      paddingHorizontal: 8,
      backgroundColor: '#14213d',
      color: '#fff',
      borderRadius: 3,
    },
    balanceLabel: { fontSize: 11, fontWeight: 700 },
    balanceValue: { fontSize: 13, fontWeight: 700 },
    notes: { marginTop: 24, padding: 10, backgroundColor: '#f4f4f4', borderRadius: 4 },
    notesTitle: { fontSize: 9, color: '#888', textTransform: 'uppercase', marginBottom: 3 },
    footer: {
      position: 'absolute',
      bottom: 28,
      left: 40,
      right: 40,
      fontSize: 8,
      color: '#888',
      textAlign: 'center',
    },
  });

  const e = React.createElement;

  const itemsTable = e(
    View,
    { style: styles.table },
    e(
      View,
      { style: styles.tableRowHeader },
      e(Text, { style: [styles.colLabel, styles.bold] }, 'Désignation'),
      e(Text, { style: [styles.colQty, styles.bold] }, 'Qté'),
      e(Text, { style: [styles.colUnit, styles.bold] }, 'P.U.'),
      e(Text, { style: [styles.colAmount, styles.bold] }, 'Montant'),
    ),
    ...items.map((it, i) =>
      e(
        View,
        { key: String(i), style: styles.tableRow },
        e(Text, { style: styles.colLabel }, it.label),
        e(Text, { style: styles.colQty }, String(it.quantity)),
        e(Text, { style: styles.colUnit }, money(it.unitPrice, currency)),
        e(Text, { style: [styles.colAmount, styles.bold] }, money(it.amount, currency)),
      ),
    ),
  );

  return e(
    Document,
    { title: `Facture ${invoiceNumber}`, author: schoolName },
    e(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      e(
        View,
        { style: styles.header },
        e(View, null, e(Text, { style: styles.schoolName }, schoolName)),
        e(
          View,
          null,
          e(Text, { style: styles.docLabel }, 'FACTURE'),
          e(Text, { style: styles.docMeta }, `N° ${invoiceNumber}`),
        ),
      ),
      // Meta: billed-to + dates
      e(
        View,
        { style: styles.metaRow },
        e(
          View,
          { style: styles.metaBlock },
          e(Text, { style: styles.metaTitle }, 'Facturé à'),
          e(Text, { style: styles.metaValue }, billedToName ?? 'Établissement'),
          e(Text, { style: styles.statusPill }, statusLabel),
        ),
        e(
          View,
          { style: styles.metaBlock },
          e(Text, { style: styles.metaTitle }, 'Objet'),
          e(Text, { style: styles.metaValue }, title),
          e(Text, { style: { marginTop: 8, fontSize: 9, color: '#666' } }, `Émise le ${formatDate(issueDate)}`),
          e(Text, { style: { fontSize: 9, color: '#666' } }, `Échéance le ${formatDate(dueDate)}`),
        ),
      ),
      itemsTable,
      // Totals
      e(
        View,
        { style: styles.totals },
        e(
          View,
          { style: styles.totalRow },
          e(Text, null, 'Total'),
          e(Text, { style: styles.bold }, money(total, currency)),
        ),
        e(
          View,
          { style: styles.totalRow },
          e(Text, null, 'Payé'),
          e(Text, { style: styles.bold }, money(paidTotal, currency)),
        ),
        e(
          View,
          { style: styles.balanceRow },
          e(Text, { style: styles.balanceLabel }, 'Reste à payer'),
          e(Text, { style: styles.balanceValue }, money(balance, currency)),
        ),
      ),
      // Notes
      notes
        ? e(
            View,
            { style: styles.notes },
            e(Text, { style: styles.notesTitle }, 'Notes'),
            e(Text, null, notes),
          )
        : null,
      // Footer
      e(
        Text,
        { style: styles.footer },
        `Facture générée le ${new Date(generatedAt).toLocaleString('fr-FR')} — ${schoolName} · Klasso`,
      ),
    ),
  );
}
