import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Roles a SUPER_ADMIN may seed when provisioning a school (not admin/super). */
export type PersonaRole = Extract<UserRole, 'TEACHER' | 'PARENT' | 'STAFF'>;

export class PersonaInput {
  @ApiProperty({ enum: ['TEACHER', 'PARENT', 'STAFF'] })
  @IsEnum(UserRole)
  role!: PersonaRole;

  @ApiProperty({ maxLength: 254 })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;
}

export class SeedPersonasDto {
  @ApiProperty({ type: [PersonaInput], description: 'Initial teacher/parent/staff accounts' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PersonaInput)
  personas!: PersonaInput[];
}

export class SeededPersonaDto {
  @ApiProperty() email!: string;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty() inviteUrl!: string;
  @ApiProperty() inviteExpiresAt!: string;
}

export class SeedPersonasResponseDto {
  @ApiProperty({ type: [SeededPersonaDto] }) created!: SeededPersonaDto[];
  @ApiProperty({ description: 'Emails skipped because already present in the tenant' })
  skipped!: string[];
}
