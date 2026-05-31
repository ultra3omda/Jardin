import { Logger, Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ClicToPayGateway } from './gateway/clictopay.gateway';
import { MockGateway } from './gateway/mock.gateway';
import { PAYMENT_GATEWAY } from './gateway/payment-gateway.interface';

/**
 * GTM — Payments. Selects the real ClicToPay gateway when CLICTOPAY_USER is set,
 * otherwise a deterministic MockGateway (dev/tests/CI).
 */
@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    ClicToPayGateway,
    MockGateway,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ClicToPayGateway, MockGateway],
      useFactory: (clictopay: ClicToPayGateway, mock: MockGateway) => {
        const useReal = Boolean(process.env.CLICTOPAY_USER);
        new Logger('PaymentsModule').log(
          `Payment gateway: ${useReal ? 'ClicToPay' : 'Mock (set CLICTOPAY_USER to enable ClicToPay)'}`,
        );
        return useReal ? clictopay : mock;
      },
    },
  ],
})
export class PaymentsModule {}
