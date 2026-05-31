import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { HealthRecordsController } from './health-records.controller';
import { HealthRecordsService } from './health-records.service';
import { InfirmaryVisitsController } from './infirmary-visits.controller';
import { InfirmaryVisitsService } from './infirmary-visits.service';
import { VaccinationsController } from './vaccinations.controller';
import { VaccinationsService } from './vaccinations.service';

/**
 * T2b — Santé scolaire (PII médicale). Distinct du healthcheck `HealthModule`.
 * RBAC : SCHOOL_ADMIN + STAFF gèrent · PARENT lit ses enfants · TEACHER aucun accès.
 */
@Module({
  imports: [NotificationsModule],
  controllers: [HealthRecordsController, InfirmaryVisitsController, VaccinationsController],
  providers: [HealthRecordsService, InfirmaryVisitsService, VaccinationsService],
})
export class StudentHealthModule {}
