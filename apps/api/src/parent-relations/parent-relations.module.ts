import { Module } from '@nestjs/common';

import { ParentRelationsController } from './parent-relations.controller';
import { ParentRelationsService } from './parent-relations.service';

/**
 * V3-A — Module Lien Parent ↔ Élève.
 * PrismaService global via PrismaModule (@Global) → pas d'imports nécessaire.
 */
@Module({
  controllers: [ParentRelationsController],
  providers: [ParentRelationsService],
  exports: [ParentRelationsService],
})
export class ParentRelationsModule {}
