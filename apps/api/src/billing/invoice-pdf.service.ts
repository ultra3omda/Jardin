import { Injectable } from '@nestjs/common';
import type React from 'react';

import {
  buildInvoiceDocument,
  type InvoiceDocumentProps,
  type ReactPdfPrimitives,
} from './templates/invoice-document';

// Same approach as BulletinPdfService: `@react-pdf/renderer` v4 is pure ESM and
// cannot be statically required from this CJS-compiled NestJS code. We load it
// via a runtime dynamic import hidden from TS so it isn't rewritten to require().
interface ReactPdfModule extends ReactPdfPrimitives {
  renderToBuffer: (element: React.ReactElement) => Promise<Buffer>;
}

const dynamicImport = new Function('p', 'return import(p)') as <T>(p: string) => Promise<T>;

let cached: ReactPdfModule | null = null;

async function loadReactPdf(): Promise<ReactPdfModule> {
  if (cached) return cached;
  const mod = await dynamicImport<ReactPdfModule>('@react-pdf/renderer');
  cached = mod;
  return mod;
}

@Injectable()
export class InvoicePdfService {
  async render(props: InvoiceDocumentProps): Promise<Buffer> {
    const pdf = await loadReactPdf();
    const element = buildInvoiceDocument(pdf, props);
    return pdf.renderToBuffer(element);
  }
}
