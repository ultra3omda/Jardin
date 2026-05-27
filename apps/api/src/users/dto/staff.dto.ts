import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateTeacherDto {
  @ApiProperty({ example: 'ahmed.ben.ali@ecole.tn' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Ahmed' })
  @IsString() @MinLength(1) @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Ben Ali' })
  @IsString() @MinLength(1) @MaxLength(100)
  lastName!: string;
}

export class UpdateTeacherDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class CreateParentDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString() @MinLength(1) @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @IsString() @MinLength(1) @MaxLength(100)
  lastName!: string;
}

export class StaffUserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional({ nullable: true }) deletedAt!: Date | null;
  @ApiPropertyOptional({ description: 'Shown once on create', nullable: true })
  tempPassword?: string;
}

export class ListStaffResponseDto {
  @ApiProperty({ type: [StaffUserResponseDto] }) items!: StaffUserResponseDto[];
  @ApiProperty() total!: number;
}
