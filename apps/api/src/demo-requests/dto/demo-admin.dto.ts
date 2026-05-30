import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { DEMO_STATUSES, type DemoStatus } from '../demo-status.util';

export class DemoRequestAdminDto {
  @ApiProperty() requestId!: string;
  @ApiProperty() email!: string;
  @ApiProperty() schoolName!: string;
  @ApiPropertyOptional({ nullable: true }) studentsCount!: number | null;
  @ApiPropertyOptional({ nullable: true }) locale!: string | null;
  @ApiProperty() receivedAt!: string;
  @ApiProperty({ enum: DEMO_STATUSES }) status!: DemoStatus;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiPropertyOptional({ nullable: true }) statusUpdatedAt!: string | null;
}

export class UpdateDemoStatusDto {
  @ApiProperty({ enum: DEMO_STATUSES })
  @IsIn(DEMO_STATUSES as unknown as string[])
  status!: DemoStatus;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
