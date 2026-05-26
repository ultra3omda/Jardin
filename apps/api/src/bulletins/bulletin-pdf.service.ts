import { Injectable } from '@nestjs/common';
import type React from 'react';

import {
  buildBulletinDocument,
  type BulletinDocumentProps,
  type ReactPdfPrimitives,
} from './templates/bulletin-document';

// `@react-pdf/renderer` v4 is pure ESM. NestJS bundles the API as CJS, and TS
// with `module: commonjs` rewrites a bare `await import('x')` into
// `Promise.resolve(require('x'))` which still triggers ERR_REQUIRE_ESM.
// We use `new Function('p', 'return import(p)')` so TS cannot see the dynamic
// import at compile time and emits it verbatim — Node then runs the real
// host-native `import()` which loads ESM modules from CJS contexts.
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
export class BulletinPdfService {
  async render(props: BulletinDocumentProps): Promise<Buffer> {
    const pdf = await loadReactPdf();
    const element = buildBulletinDocument(pdf, props);
    return pdf.renderToBuffer(element);
  }
}
