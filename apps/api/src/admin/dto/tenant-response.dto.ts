import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Locale, TenantType } from '@prisma/client';
import type { TenantBrand } from '@ecole-saas/shared';

export class TenantSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: TenantType }) type!: TenantType;
  @ApiProperty({ enum: Locale }) locale!: Locale;
  @ApiPropertyOptional({ nullable: true, type: Object })
  brand!: TenantBrand | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty() usersCount!: number;
  @ApiProperty() adminOnboarded!: boolean;
  @ApiProperty({ enum: ['pending', 'consumed', 'expired'], nullable: true })
  inviteStatus!: 'pending' | 'consumed' | 'expired' | null;
  @ApiProperty({ enum: ['NONE', 'PROVISIONING', 'ACTIVE', 'FAILED'] })
  domainStatus!: string;
  @ApiPropertyOptional({ nullable: true }) customDomain!: string | null;
}

export class InviteSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class CreateTenantResponseDto {
  @ApiProperty({ type: TenantSummaryDto }) tenant!: TenantSummaryDto;
  @ApiPropertyOptional({ type: InviteSummaryDto, nullable: true })
  invite!: InviteSummaryDto | null;
  @ApiProperty() inviteEmailSent!: boolean;
  @ApiProperty({ enum: ['NONE', 'PROVISIONING', 'ACTIVE', 'FAILED'] })
  domainStatus!: string;
}
