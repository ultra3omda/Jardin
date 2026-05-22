import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Single-use password reset token from the email link.',
    minLength: 20,
    maxLength: 256,
  })
  @IsString()
  @Length(20, 256)
  token!: string;

  @ApiProperty({
    description: 'New password. Server hashes with bcrypt rounds 12.',
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @Length(12, 128)
  newPassword!: string;
}
