import { Module } from '@nestjs/common';

import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

/**
 * T2c — RH / Paie. V1 : contrats. V2 : congés. V3 : bulletins de paie.
 */
@Module({
  controllers: [ContractsController, LeavesController, PayrollController],
  providers: [ContractsService, LeavesService, PayrollService],
})
export class HrModule {}
