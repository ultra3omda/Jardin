import { ApiProperty } from '@nestjs/swagger';

export class OverviewDto {
  @ApiProperty() tenants!: number;
  @ApiProperty() users!: number;
  @ApiProperty() students!: number;
  @ApiProperty() pendingDemoRequests!: number;
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
