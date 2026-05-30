import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateHealthRecordDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8) bloodType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) allergies?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) chronicConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) medications?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) dietaryRestrictions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) doctorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) doctorPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) emergencyContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) emergencyContactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

// Update = same optional fields minus studentId (the record is bound to its student).
export class UpdateHealthRecordDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8) bloodType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) allergies?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) chronicConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) medications?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) dietaryRestrictions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) doctorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) doctorPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) emergencyContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) emergencyContactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class ListHealthRecordsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
}

export class HealthRecordResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiPropertyOptional() bloodType?: string | null;
  @ApiPropertyOptional() allergies?: string | null;
  @ApiPropertyOptional() chronicConditions?: string | null;
  @ApiPropertyOptional() medications?: string | null;
  @ApiPropertyOptional() dietaryRestrictions?: string | null;
  @ApiPropertyOptional() doctorName?: string | null;
  @ApiPropertyOptional() doctorPhone?: string | null;
  @ApiPropertyOptional() emergencyContactName?: string | null;
  @ApiPropertyOptional() emergencyContactPhone?: string | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() updatedById!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListHealthRecordsResponseDto {
  @ApiProperty({ type: [HealthRecordResponseDto] }) items!: HealthRecordResponseDto[];
  @ApiProperty() total!: number;
}
