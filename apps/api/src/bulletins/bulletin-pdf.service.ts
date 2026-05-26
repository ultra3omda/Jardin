import { Injectable } from '@nestjs/common';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import React from 'react';

import { BulletinDocument, type BulletinDocumentProps } from './templates/bulletin-document';

@Injectable()
export class BulletinPdfService {
  async render(props: BulletinDocumentProps): Promise<Buffer> {
    // BulletinDocument returns a <Document> root, but TS sees the JSX as
    // ReactElement<BulletinDocumentProps>. Cast to satisfy renderToBuffer's
    // ReactElement<DocumentProps> signature (runtime tree is correct).
    const element = React.createElement(
      BulletinDocument,
      props,
    ) as unknown as React.ReactElement<DocumentProps>;
    return renderToBuffer(element);
  }
}
