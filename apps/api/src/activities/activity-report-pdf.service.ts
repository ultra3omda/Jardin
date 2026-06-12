import { Injectable } from '@nestjs/common';
import type React from 'react';

import {
  buildActivityReportDocument,
  type ActivityReportProps,
  type ReactPdfPrimitives,
} from './templates/activity-report-document';

// `@react-pdf/renderer` v4 is pure ESM — same dynamic-import trick as
// BulletinPdfService so TS (module: commonjs) doesn't rewrite it into require().
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
export class ActivityReportPdfService {
  async render(props: ActivityReportProps): Promise<Buffer> {
    const pdf = await loadReactPdf();
    const element = buildActivityReportDocument(pdf, props);
    return pdf.renderToBuffer(element);
  }
}
