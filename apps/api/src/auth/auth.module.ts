import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AdminModule } from '../admin/admin.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordRecoveryService } from './password-recovery.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    AdminModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.accessExpiresIn', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, EmailVerificationService, PasswordRecoveryService],
  exports: [AuthService, EmailVerificationService, PasswordRecoveryService],
})
export class AuthModule {}
