import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export type InviteTokenStatus = 'pending' | 'consumed' | 'expired';

/**
 * Response returned on POST /admin/invite-tokens.
 *
 * The plaintext `token` and `url` are returned ONCE on creation and never
 * persisted server-side (only the SHA-256 hash is stored). The caller is
 * responsible for transmitting the URL to the invitee out-of-band.
 */
export class InviteTokenCreatedDto {
  @ApiProperty({ example: 'cl9b2x4q70000mp2sdz3w1a7e' })
  id!: string;

  @ApiProperty({
    description: 'Plaintext invite token. Shown only on creation — store it now or it is lost.',
    example: 'q-VkXhg7BvK9-DfXz0fG2Yg1mE9TfX2c1z2u3v4w5x6',
  })
  token!: string;

  @ApiProperty({
    description: 'Absolute URL pointing at the web /register page with the token pre-filled.',
    example: 'https://ecole-saas-weld.vercel.app/register?token=q-VkXhg7BvK9-...',
  })
  url!: string;

  @ApiProperty({ nullable: true, example: 'futur-directeur@ecole.fr' })
  invitedEmail!: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.SCHOOL_ADMIN })
  intendedRole!: UserRole;

  @ApiProperty({ example: '2026-05-29T10:00:00.000Z', format: 'date-time' })
  expiresAt!: string;
}

/**
 * Response item returned on GET /admin/invite-tokens (list).
 *
 * Notably DOES NOT include the plaintext token — only metadata.
 */
export class InviteTokenListItemDto {
  @ApiProperty({ example: 'cl9b2x4q70000mp2sdz3w1a7e' })
  id!: string;

  @ApiProperty({ nullable: true })
  invitedEmail!: string | null;

  @ApiProperty({ enum: UserRole })
  intendedRole!: UserRole;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ nullable: true, format: 'date-time' })
  consumedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ enum: ['pending', 'consumed', 'expired'] })
  status!: InviteTokenStatus;
}
