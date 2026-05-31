import { ApiProperty } from '@nestjs/swagger';

export class OverviewDto {
  @ApiProperty() tenants!: number;
  @ApiProperty() users!: number;
  @ApiProperty() students!: number;
  @ApiProperty() pendingDemoRequests!: number;
  @ApiProperty() activeSubscriptions!: number;
  @ApiProperty({ description: 'Monthly Recurring Revenue (TND), normalised from active subs' })
  mrr!: string;
  @ApiProperty({ description: 'Annual Recurring Revenue (TND) = MRR × 12' })
  arr!: string;
  @ApiProperty({ description: 'Devise du revenu' }) currency!: string;
}

export class GrowthPointDto {
  @ApiProperty({ description: 'Mois au format YYYY-MM' }) month!: string;
  @ApiProperty() newTenants!: number;
  @ApiProperty() cumulativeTenants!: number;
}

export class CategoryCountDto {
  @ApiProperty() label!: string;
  @ApiProperty() count!: number;
}

export class AnalyticsDto {
  @ApiProperty({ type: [GrowthPointDto] }) tenantGrowth!: GrowthPointDto[];
  @ApiProperty({ type: [CategoryCountDto] }) tenantsByType!: CategoryCountDto[];
  @ApiProperty({ type: [CategoryCountDto] }) tenantsByLocale!: CategoryCountDto[];
  @ApiProperty({ type: [CategoryCountDto] }) usersByRole!: CategoryCountDto[];
}
