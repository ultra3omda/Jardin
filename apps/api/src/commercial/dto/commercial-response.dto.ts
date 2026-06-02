import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Locale, TenantStatus, TenantType } from '@prisma/client';

import { InviteSummaryDto } from '../../admin/dto/tenant-response.dto';

export class ContractSummaryDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true }) reference!: string | null;
  @ApiProperty() fileName!: string;
  @ApiProperty({ format: 'date-time' }) signedAt!: string;
  @ApiProperty({ format: 'date-time' }) startDate!: string;
  @ApiPropertyOptional({ nullable: true, format: 'date-time' }) endDate!: string | null;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class OrganizationSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: TenantType }) type!: TenantType;
  @ApiProperty({ enum: Locale }) locale!: Locale;
  @ApiProperty({ enum: TenantStatus }) status!: TenantStatus;
  @ApiProperty() onboardingCompleted!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({
    enum: ['pending', 'consumed', 'expired'],
    nullable: true,
    description: "État de l'invitation de l'admin.",
  })
  inviteStatus!: 'pending' | 'consumed' | 'expired' | null;
  @ApiProperty({ description: 'Nombre de contrats rattachés.' })
  contractsCount!: number;
}

export class CreateOrganizationResponseDto {
  @ApiProperty({ type: OrganizationSummaryDto }) organization!: OrganizationSummaryDto;
  @ApiPropertyOptional({ type: ContractSummaryDto, nullable: true })
  contract!: ContractSummaryDto | null;
  @ApiProperty({ type: InviteSummaryDto }) invite!: InviteSummaryDto;
  @ApiProperty() inviteEmailSent!: boolean;
}

export class CommercialAgentDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiPropertyOptional({ nullable: true, format: 'date-time' }) lastLoginAt!: string | null;
}
