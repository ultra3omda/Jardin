import { Module } from '@nestjs/common';

import { ExportService } from './export.service';
import { SessionsService } from './sessions.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, SessionsService, ExportService],
  exports: [UsersService, SessionsService, ExportService],
})
export class UsersModule {}
