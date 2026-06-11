import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export const DEMO_PERSONAS = [
  'admin-primary',
  'admin-kindergarten',
  'teacher-primary',
  'teacher-kindergarten',
  'parent-primary',
  'parent-kindergarten',
  'staff',
  'staff-kindergarten',
] as const;

export type DemoPersona = (typeof DEMO_PERSONAS)[number];

export class DemoLoginDto {
  @ApiProperty({ enum: DEMO_PERSONAS, example: 'admin-primary' })
  @IsString()
  @IsIn(DEMO_PERSONAS as unknown as string[])
  persona!: DemoPersona;
}
