import { Module } from '@nestjs/common';

import { ExportService } from './export.service';
import { SessionsService } from './sessions.service';
import { StaffController } from './staff.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, StaffController],
  providers: [UsersService, SessionsService, ExportService],
  exports: [UsersService, SessionsService, ExportService],
})
export class UsersModule {}
