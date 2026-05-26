import { Module } from '@nestjs/common';

import { BulletinPdfService } from './bulletin-pdf.service';
import { BulletinsController } from './bulletins.controller';
import { BulletinsService } from './bulletins.service';

/** V6 — Bulletins (PDF generation). */
@Module({
  controllers: [BulletinsController],
  providers: [BulletinsService, BulletinPdfService],
  exports: [BulletinsService],
})
export class BulletinsModule {}
