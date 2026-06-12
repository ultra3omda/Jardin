import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivityReportController } from './activity-report.controller';
import { ActivityReportPdfService } from './activity-report-pdf.service';
import { ActivityReportService } from './activity-report.service';

/** T2b — Activités. G5 — rapports d'activité PDF (R2 @Global, fanout via NotificationsModule). */
@Module({
  imports: [NotificationsModule],
  controllers: [ActivitiesController, ActivityReportController],
  providers: [ActivitiesService, ActivityReportService, ActivityReportPdfService],
})
export class ActivitiesModule {}
