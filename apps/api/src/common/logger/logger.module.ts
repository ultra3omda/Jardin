import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IncomingMessage } from 'node:http';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('nodeEnv') === 'production';
        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            genReqId: (req: IncomingMessage) => {
              const headerId = req.headers['x-request-id'];
              return typeof headerId === 'string' && headerId.length > 0 ? headerId : randomUUID();
            },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.currentPassword',
                'req.body.newPassword',
                'req.body.passwordHash',
                'req.body.refreshToken',
                'req.body.token',
                'res.headers["set-cookie"]',
                // Credentials / tokens anywhere in the tree.
                '*.password',
                '*.passwordHash',
                '*.refreshToken',
                '*.accessToken',
                '*.token',
                '*.tokenHash',
                // Sensitive domain PII — never belongs in logs (RGPD + santé).
                // Health: medical free-text, allergies, conditions, treatments.
                '*.medicalNotes',
                '*.allergies',
                '*.medicalConditions',
                '*.medications',
                '*.treatment',
                '*.diagnosis',
                // Payroll / finance amounts tied to a person.
                '*.baseSalary',
                '*.salary',
                '*.netSalary',
                '*.grossSalary',
                // Notification payloads can carry any of the above.
                '*.data',
              ],
              censor: '***REDACTED***',
              // Don't crash logging if a redact path doesn't resolve.
              remove: false,
            },
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    translateTime: 'SYS:HH:MM:ss.l',
                    ignore: 'pid,hostname,req.headers,res.headers',
                  },
                },
            customLogLevel: (_req, res, err) => {
              if (err || res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
