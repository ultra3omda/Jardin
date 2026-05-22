import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInviteTokenDto {
  @ApiPropertyOptional({
    example: 'futur-directeur@ecole.fr',
    description: 'If set, the register flow will reject any email that does not match this one.',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  invitedEmail?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.SCHOOL_ADMIN,
    description: 'Role the invitee will receive on registration. Defaults to SCHOOL_ADMIN.',
  })
  @IsOptional()
  @IsEnum(UserRole)
  intendedRole?: UserRole;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 90,
    default: 7,
    description: 'Token lifetime in days. Defaults to 7.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  expiresInDays?: number;
}
