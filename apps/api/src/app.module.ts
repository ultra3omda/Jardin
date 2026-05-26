import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { DemoRequestsModule } from './demo-requests/demo-requests.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { TenantContextInterceptor } from './auth/interceptors/tenant-context.interceptor';
import { configuration } from './common/config/configuration';
import { validateEnv } from './common/config/env.validation';
import { EmailModule } from './common/email/email.module';
import { LoggerModule } from './common/logger/logger.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { R2Module } from './common/r2/r2.module';
import { TenantModule } from './common/tenant/tenant.module';
import { HealthModule } from './health/health.module';
import { StudentsModule } from './students/students.module';
import { TenantBrandModule } from './tenant-brand/tenant-brand.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // V1.5 — Sentry MUST be first so its interceptors / async-context tracking
    // wraps every downstream module.
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      cache: true,
    }),
    LoggerModule,
    TenantModule,
    PrismaModule,
    EmailModule,
    R2Module,
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60_000, limit: 100 },
    ]),
    AuthModule,
    AdminModule,
    DemoRequestsModule,
    UsersModule,
    HealthModule,
    TenantBrandModule,
    StudentsModule,
  ],
  providers: [
    // V1.5 — Sentry global filter MUST be first so it catches every other
    // filter's caught exceptions and forwards them to Sentry.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    // Order matters: rate limit first, then auth, then role check, then
    // wrap the request in a tenant context for downstream services.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
