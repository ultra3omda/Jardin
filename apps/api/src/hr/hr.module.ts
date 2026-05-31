import { Module } from '@nestjs/common';

import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';

/**
 * T2c — RH / Paie. V1 : contrats de travail. V2 : demandes de congés.
 * (Paie en V3 — mêmes conventions.)
 */
@Module({
  controllers: [ContractsController, LeavesController],
  providers: [ContractsService, LeavesService],
})
export class HrModule {}
