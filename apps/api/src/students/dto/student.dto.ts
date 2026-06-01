import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { RelationType, Sex } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * V2 — Module Élèves : DTOs.
 * Décision D24 — 15 champs "Complet" (identité + scolarité + famille + contact + langue + médical light + photo).
 * Spec : docs/superpowers/specs/2026-05-25-v2-eleves-module-design.md
 */
export class CreateStudentDto {
  // — Identité —
  @ApiProperty({ example: 'Alice', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Ben Salem', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: '2018-09-15', description: 'ISO 8601 date (YYYY-MM-DD)' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ enum: Sex, example: Sex.F })
  @IsEnum(Sex)
  sex!: Sex;

  @ApiPropertyOptional({ example: 'TN', description: 'ISO 3166-1 alpha-2 (TN, FR, DZ, MA...)' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  nationality?: string;

  // — Scolarité —
  @ApiPropertyOptional({
    example: 'CP-A',
    maxLength: 50,
    description:
      "Nom de classe (texte). Optionnel si `classId` est fourni — alors dérivé du nom de la classe. Au moins l'un des deux (classId/classroom) est requis à la création.",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  classroom?: string;

  @ApiPropertyOptional({
    example: 'cl_abc123',
    description: 'Lot 3 — id (cuid2) de la classe rattachée. Source de vérité ; synchronise `classroom`.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  classId?: string;

  @ApiPropertyOptional({ example: '2024-09-01', description: 'ISO 8601 date; défaut = today' })
  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  previousSchooling?: string;

  // — Famille —
  @ApiProperty({
    example: 'parent@example.tn',
    maxLength: 254,
    description:
      "Email du parent/tuteur. Si un compte parent existe pour cet email, un lien parent↔élève est créé automatiquement à la création.",
  })
  @IsEmail()
  @MaxLength(254)
  parentEmail!: string;

  @ApiPropertyOptional({
    enum: RelationType,
    default: RelationType.MOTHER,
    description: "Nature du lien du parent rattaché (défaut : MÈRE).",
  })
  @IsOptional()
  @IsEnum(RelationType)
  parentRelationType?: RelationType;

  @ApiPropertyOptional({ example: 0, default: 0, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  siblingsCount?: number;

  // — Contact —
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'TN', default: 'TN', description: 'ISO 3166-1 alpha-2' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  // — Langue —
  @ApiPropertyOptional({ example: 'ar', description: 'ISO 639-1 alpha-2 (ar, fr, en...)' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  motherTongue?: string;

  // — Santé (light V2, médical strict V8) —
  @ApiPropertyOptional({
    maxLength: 2000,
    description: 'WARNING RGPD — light V2, médical strict en V8',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  medicalNotes?: string;

  // — Photo —
  @ApiPropertyOptional({ format: 'url', description: 'R2 public URL' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  photoUrl?: string;
}

export class UpdateStudentDto extends PartialType(CreateStudentDto) {}

export class ClassSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() level!: string;
}

export class StudentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ format: 'date' }) dateOfBirth!: string;
  @ApiProperty({ enum: Sex }) sex!: Sex;
  @ApiProperty({ nullable: true }) nationality!: string | null;
  @ApiProperty() classroom!: string;
  @ApiProperty({ nullable: true, description: 'Lot 3 — FK classe (null si non rattaché)' })
  classId!: string | null;
  @ApiPropertyOptional({ type: ClassSummaryDto, nullable: true })
  class!: ClassSummaryDto | null;
  @ApiProperty({ format: 'date' }) enrollmentDate!: string;
  @ApiProperty({ nullable: true }) previousSchooling!: string | null;
  @ApiProperty() parentEmail!: string;
  @ApiProperty() siblingsCount!: number;
  @ApiProperty({ nullable: true }) addressLine!: string | null;
  @ApiProperty({ nullable: true }) city!: string | null;
  @ApiProperty({ nullable: true }) postalCode!: string | null;
  @ApiProperty({ nullable: true }) country!: string | null;
  @ApiProperty({ nullable: true }) motherTongue!: string | null;
  @ApiProperty({ nullable: true }) medicalNotes!: string | null;
  @ApiProperty({ nullable: true }) photoUrl!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ListStudentsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ maxLength: 100, description: 'Filtre ILIKE sur firstName/lastName' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ maxLength: 100, description: 'Filtre exact sur le champ classroom' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  classroom?: string;

  @ApiPropertyOptional({ maxLength: 40, description: 'Lot 3 — filtre exact sur la classe rattachée (classId)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  classId?: string;
}

export class ListStudentsResponseDto {
  @ApiProperty({ type: [StudentResponseDto] }) items!: StudentResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
