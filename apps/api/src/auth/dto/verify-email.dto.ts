import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description:
      'Single-use email verification token, copied from the link in the verification email.',
    minLength: 20,
    maxLength: 256,
  })
  @IsString()
  @Length(20, 256)
  token!: string;
}
