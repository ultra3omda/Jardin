import { Module } from '@nestjs/common';

import { SafetyDrillsController } from './safety-drills.controller';
import { SafetyDrillsService } from './safety-drills.service';
import { SecurityIncidentsController } from './security-incidents.controller';
import { SecurityIncidentsService } from './security-incidents.service';
import { VisitorLogsController } from './visitor-logs.controller';
import { VisitorLogsService } from './visitor-logs.service';

/**
 * T2b — Sécurité (niveau école) : incidents + visiteurs + exercices.
 * RBAC : SCHOOL_ADMIN + STAFF uniquement (pas de PARENT, pas de TEACHER).
 */
@Module({
  controllers: [SecurityIncidentsController, VisitorLogsController, SafetyDrillsController],
  providers: [SecurityIncidentsService, VisitorLogsService, SafetyDrillsService],
})
export class SecurityModule {}
