import { Module } from '@nestjs/common';

import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

/**
 * T2c — RH / Paie. Vague 1 : contrats de travail.
 * (Congés en V2, paie en V3 — mêmes conventions.)
 */
@Module({
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class HrModule {}
