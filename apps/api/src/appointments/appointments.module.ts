import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

/** G6 — Rendez-vous parents. SMS (@Global) + fanout via NotificationsModule. */
@Module({
  imports: [NotificationsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
