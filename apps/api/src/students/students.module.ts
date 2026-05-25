import { Module } from '@nestjs/common';

import { StudentsBulkImportService } from './students-bulk-import.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

/**
 * V2 — Module Élèves.
 * PrismaService is provided globally by PrismaModule, so no extra imports needed here.
 */
@Module({
  controllers: [StudentsController],
  providers: [StudentsService, StudentsBulkImportService],
  exports: [StudentsService],
})
export class StudentsModule {}
