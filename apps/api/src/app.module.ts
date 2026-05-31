import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { ActivitiesModule } from './activities/activities.module';
import { AdminModule } from './admin/admin.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { BulletinsModule } from './bulletins/bulletins.module';
import { CanteenModule } from './canteen/canteen.module';
import { DemoLoginModule } from './demo-login/demo-login.module';
import { DemoRequestsModule } from './demo-requests/demo-requests.module';
import { DisciplineModule } from './discipline/discipline.module';
import { StudentHealthModule } from './student-health/student-health.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { TenantContextInterceptor } from './auth/interceptors/tenant-context.interceptor';
import { configuration } from './common/config/configuration';
import { validateEnv } from './common/config/env.validation';
import { EmailModule } from './common/email/email.module';
import { LoggerModule } from './common/logger/logger.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { PushModule } from './common/push/push.module';
import { R2Module } from './common/r2/r2.module';
import { TenantModule } from './common/tenant/tenant.module';
import { ClassesModule } from './classes/classes.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { GradePeriodsModule } from './grade-periods/grade-periods.module';
import { HealthModule } from './health/health.module';
import { JournalModule } from './journal/journal.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ParentRelationsModule } from './parent-relations/parent-relations.module';
import { SecurityModule } from './security/security.module';
import { StudentsModule } from './students/students.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TenantBrandModule } from './tenant-brand/tenant-brand.module';
import { TransportModule } from './transport/transport.module';
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
    PushModule, // V10
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
    ParentRelationsModule, // V3-A
    MessagingModule, // V3-B
    NotificationsModule, // V8
    ClassesModule, // V4
    SubjectsModule, // V6
    JournalModule, // T2b
    ActivitiesModule, // T2b
    DisciplineModule, // T2b PR-2
    StudentHealthModule, // T2b PR-2
    CanteenModule, // T2b PR-3
    TransportModule, // T2b PR-3
    SecurityModule, // T2b PR-4
    GradePeriodsModule, // V6
    EvaluationsModule, // V6
    BulletinsModule, // V6
    DemoLoginModule, // V7
    BillingModule, // V8
    AnnouncementsModule, // V9
    AttendanceModule, // V9
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
