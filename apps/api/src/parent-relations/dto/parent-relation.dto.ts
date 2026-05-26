import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RelationType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * V3-A — Crée un lien parent (User role=PARENT) ↔ élève.
 *
 * Le parentUserId DOIT correspondre à un User existant avec role=PARENT dans
 * le même tenant (vérifié côté service). L'unicité (parentUserId, studentId)
 * est enforced par index unique DB.
 */
export class CreateParentRelationDto {
  @ApiProperty({ description: 'User ID du parent (rôle PARENT)', example: 'cuid2_parent_xxx' })
  @IsString()
  @MinLength(1)
  parentUserId!: string;

  @ApiProperty({ description: 'Student ID', example: 'cuid2_student_xxx' })
  @IsString()
  @MinLength(1)
  studentId!: string;

  @ApiProperty({ enum: RelationType, description: 'Nature du lien' })
  @IsEnum(RelationType)
  relationType!: RelationType;

  @ApiPropertyOptional({ default: false, description: 'Contact principal pour la communication' })
  @IsOptional()
  @IsBoolean()
  isPrimaryContact?: boolean;
}

/**
 * V3-A — Update partiel : seuls relationType + isPrimaryContact mutables.
 * Pour changer le parent OU l'élève, supprimer + recréer.
 */
export class UpdateParentRelationDto {
  @ApiPropertyOptional({ enum: RelationType })
  @IsOptional()
  @IsEnum(RelationType)
  relationType?: RelationType;

  @ApiPropertyOptional({ description: 'Contact principal' })
  @IsOptional()
  @IsBoolean()
  isPrimaryContact?: boolean;
}

/** Query filter : at least one of studentId/parentUserId required (validated in service). */
export class ListParentRelationsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentUserId?: string;
}

export interface ParentSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  classroom: string;
}

export class ParentRelationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  parentUserId!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty({ enum: RelationType })
  relationType!: RelationType;

  @ApiProperty()
  isPrimaryContact!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'Joined parent summary (when expanding from student side)' })
  parent?: ParentSummary;

  @ApiPropertyOptional({ description: 'Joined student summary (when expanding from parent side)' })
  student?: StudentSummary;
}

export class ListParentRelationsResponseDto {
  @ApiProperty({ type: [ParentRelationResponseDto] })
  items!: ParentRelationResponseDto[];

  @ApiProperty()
  total!: number;
}
