import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';
import { IsString, MaxLength } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ description: 'Subscription plan code', example: 'standard-monthly' })
  @IsString()
  @MaxLength(120)
  planCode!: string;
}

export class CheckoutResponseDto {
  @ApiProperty() orderNumber!: string;
  @ApiProperty({ description: 'Hosted payment page URL — redirect the customer here' })
  redirectUrl!: string;
}

export class PaymentReturnResponseDto {
  @ApiProperty() orderNumber!: string;
  @ApiProperty({ enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] }) status!: string;
}

export class SubscriptionResponseDto {
  @ApiPropertyOptional() id?: string | null;
  @ApiPropertyOptional() planCode?: string | null;
  @ApiPropertyOptional({ enum: SubscriptionStatus }) status?: SubscriptionStatus | null;
  @ApiPropertyOptional() currentPeriodEnd?: string | null;
}
