import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class PromoteDto {
  @ApiProperty() @IsString() fromYear!: string;
  @ApiProperty() @IsString() toYear!: string;
  @ApiProperty({
    description: 'Map { fromClassId: toClassId | "GRADUATED" }',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsObject()
  mapping!: Record<string, string>;
}
