import { Module } from '@nestjs/common';

import { BusRoutesController } from './bus-routes.controller';
import { BusRoutesService } from './bus-routes.service';
import { TransportAssignmentsController } from './transport-assignments.controller';
import { TransportAssignmentsService } from './transport-assignments.service';

/**
 * T2b — Transport scolaire : lignes + arrêts (niveau école) + affectations (1/élève-ligne).
 * RBAC : SCHOOL_ADMIN + STAFF gèrent · PARENT lit (lignes + affectations de ses enfants).
 */
@Module({
  controllers: [BusRoutesController, TransportAssignmentsController],
  providers: [BusRoutesService, TransportAssignmentsService],
})
export class TransportModule {}
