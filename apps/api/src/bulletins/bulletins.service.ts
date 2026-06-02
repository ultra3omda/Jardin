import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { BulletinPdfService } from './bulletin-pdf.service';
import type {
  BulletinResponseDto,
  BulletinSnapshotDto,
  BulletinSubjectEntryDto,
  GenerateBulletinDto,
} from './dto/bulletin.dto';

interface EvaluationWithSubjectAndGrade {
  id: string;
  subjectId: string;
  maxScore: number;
  title: string;
  date: Date;
  subject: { id: string; name: string };
  grades: Array<{ id: string; studentId: string; score: number }>;
}

@Injectable()
export class BulletinsService {
  private readonly logger = new Logger(BulletinsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: BulletinPdfService,
  ) {}

  async generate(
    dto: GenerateBulletinDto,
    user: AuthenticatedUser,
  ): Promise<{ bulletin: BulletinResponseDto; snapshot: BulletinSnapshotDto; pdf: Buffer }> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, classroom: true },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });

    const period = await this.prisma.gradePeriod.findFirst({
      where: { id: dto.gradePeriodId, tenantId: user.tenantId },
      select: { id: true, name: true, schoolYear: true },
    });
    if (!period) throw new NotFoundException({ code: 'PERIOD_NOT_FOUND' });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true },
    });

    const evaluations = (await this.prisma.evaluation.findMany({
      where: {
        tenantId: user.tenantId,
        gradePeriodId: period.id,
      },
      include: {
        subject: { select: { id: true, name: true } },
        grades: {
          where: { studentId: student.id },
          select: { id: true, studentId: true, score: true },
        },
      },
      orderBy: [{ subject: { name: 'asc' } }, { date: 'asc' }],
    })) as unknown as EvaluationWithSubjectAndGrade[];

    const snapshot = this.buildSnapshot({
      student,
      period,
      schoolName: tenant?.name ?? 'École',
      evaluations,
    });

    const pdfBuffer = await this.pdf.render({
      schoolName: snapshot.schoolName,
      studentFirstName: snapshot.student.firstName,
      studentLastName: snapshot.student.lastName,
      studentClassroom: snapshot.student.classroom,
      periodName: snapshot.period.name,
      schoolYear: snapshot.period.schoolYear,
      subjects: snapshot.subjects,
      overallAverage: snapshot.overallAverage,
      generatedAt: snapshot.generatedAt,
    });

    const bulletin = await this.prisma.bulletin.upsert({
      where: {
        unique_bulletin_per_student_period: {
          studentId: student.id,
          gradePeriodId: period.id,
        },
      },
      create: {
        id: createId(),
        tenantId: user.tenantId,
        studentId: student.id,
        gradePeriodId: period.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: snapshot as any,
        generatedById: user.id,
      },
      update: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: snapshot as any,
        generatedById: user.id,
        generatedAt: new Date(),
      },
    });

    return {
      bulletin: {
        id: bulletin.id,
        studentId: bulletin.studentId,
        gradePeriodId: bulletin.gradePeriodId,
        generatedAt: bulletin.generatedAt,
        generatedById: bulletin.generatedById,
        pdfUrl: bulletin.pdfUrl,
      },
      snapshot,
      pdf: pdfBuffer,
    };
  }

  async getLatest(
    studentId: string,
    gradePeriodId: string,
    user: AuthenticatedUser,
  ): Promise<BulletinResponseDto | null> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    // A parent may only read the bulletins of their own children.
    if (user.role === UserRole.PARENT) {
      const link = await this.prisma.parentStudent.findFirst({
        where: { tenantId: user.tenantId, parentUserId: user.id, studentId },
        select: { id: true },
      });
      if (!link) throw new ForbiddenException({ code: 'NOT_YOUR_CHILD' });
    }
    const b = await this.prisma.bulletin.findFirst({
      where: { tenantId: user.tenantId, studentId, gradePeriodId },
    });
    if (!b) return null;
    return {
      id: b.id,
      studentId: b.studentId,
      gradePeriodId: b.gradePeriodId,
      generatedAt: b.generatedAt,
      generatedById: b.generatedById,
      pdfUrl: b.pdfUrl,
    };
  }

  private buildSnapshot(args: {
    student: { id: string; firstName: string; lastName: string; classroom: string };
    period: { id: string; name: string; schoolYear: string };
    schoolName: string;
    evaluations: EvaluationWithSubjectAndGrade[];
  }): BulletinSnapshotDto {
    const bySubject = new Map<string, BulletinSubjectEntryDto>();

    for (const e of args.evaluations) {
      if (e.grades.length === 0) continue;
      const grade = e.grades[0];
      const scaled = (grade.score / e.maxScore) * 20;
      const entry = bySubject.get(e.subjectId) ?? {
        subjectId: e.subjectId,
        subjectName: e.subject.name,
        grades: [],
        average: null,
      };
      entry.grades.push({
        evalTitle: e.title,
        date: e.date.toISOString(),
        score: grade.score,
        maxScore: e.maxScore,
        scaledScore: scaled,
      });
      bySubject.set(e.subjectId, entry);
    }

    for (const entry of bySubject.values()) {
      const sum = entry.grades.reduce((acc, g) => acc + g.scaledScore, 0);
      entry.average = entry.grades.length > 0 ? sum / entry.grades.length : null;
    }

    const subjects = Array.from(bySubject.values()).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName, 'fr'),
    );

    const validAverages = subjects.map((s) => s.average).filter((a): a is number => a !== null);
    const overallAverage =
      validAverages.length > 0
        ? validAverages.reduce((a, b) => a + b, 0) / validAverages.length
        : null;

    return {
      student: args.student,
      period: args.period,
      schoolName: args.schoolName,
      subjects,
      overallAverage,
      generatedAt: new Date().toISOString(),
    };
  }
}
