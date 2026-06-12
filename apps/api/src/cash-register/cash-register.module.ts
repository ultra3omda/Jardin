import { Module } from '@nestjs/common';

import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { ExpensesService } from './expenses.service';

/** G1 — Caisse, dépenses, fournisseurs. */
@Module({
  controllers: [CashRegisterController],
  providers: [CashRegisterService, ExpensesService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
