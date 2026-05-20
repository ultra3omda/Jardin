import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    description: 'Opaque refresh token received from /login, /register or a previous /refresh',
  })
  @IsString()
  @Length(20, 256)
  refreshToken!: string;
}
