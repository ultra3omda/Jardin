import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

/** V9 — Annonces. G8 — circulaires (PDF joint) + calendrier scolaire. */
@Module({
  imports: [NotificationsModule],
  controllers: [AnnouncementsController, CalendarController],
  providers: [AnnouncementsService, CalendarService],
})
export class AnnouncementsModule {}
