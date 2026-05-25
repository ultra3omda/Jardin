import { Module } from '@nestjs/common';

import { StudentsBulkImportService } from './students-bulk-import.service';
import { StudentsPhotoService } from './students-photo.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

/**
 * V2 — Module Élèves.
 * PrismaService + R2Service sont fournis globalement (PrismaModule + R2Module
 * sont @Global()), donc aucun `imports: [...]` nécessaire ici.
 */
@Module({
  controllers: [StudentsController],
  providers: [StudentsService, StudentsBulkImportService, StudentsPhotoService],
  exports: [StudentsService],
})
export class StudentsModule {}
